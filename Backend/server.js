const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        mensagem: "Muitas tentativas de login. Tente novamente mais tarde."
    }
});

app.use("/login", limiteLogin);

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function registrarAuditoria(usuarioId, acao, detalhes) {
    try {
        await pool.execute(
            `INSERT INTO auditoria 
            (usuario_id, acao, detalhes)
            VALUES (?, ?, ?)`,
            [usuarioId || null, acao, detalhes || null]
        );
    } catch (erro) {
        console.error("Erro ao registrar auditoria:", erro.message);
    }
}

function gerarToken(usuario) {
    return jwt.sign(
        {
            id: usuario.id,
            email: usuario.email,
            perfil: usuario.perfil
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );
}

function decodificarBase32(segredo) {
  const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const caracteres = segredo.replace(/=+$/g, "").toUpperCase();
  let bits = "";

  for (const caractere of caracteres) {
    const valor = alfabeto.indexOf(caractere);
    if (valor < 0) throw new Error("Segredo TOTP inválido.");
    bits += valor.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

function gerarSegredoTotp() {
  const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = crypto.randomBytes(20);
  let bits = [...bytes]
    .map(byte => byte.toString(2).padStart(8, "0"))
    .join("");

  let segredo = "";
  while (bits.length > 0) {
    const grupo = bits.slice(0, 5);
    bits = bits.slice(5);
    segredo += alfabeto[parseInt(grupo.padEnd(5, "0"), 2)];
  }

  return segredo;
}

function validarCodigoTotp(segredo, codigo) {
  if (!segredo || !/^\d{6}$/.test(String(codigo || ""))) {
    return false;
  }

  const chave = decodificarBase32(segredo);
  const instante = Date.now();

  // Aceita o intervalo atual e os intervalos imediatamente anterior e seguinte.
  for (const ajuste of [-1, 0, 1]) {
    const contador = BigInt(Math.floor(instante / 30000) + ajuste);
    const mensagem = Buffer.alloc(8);
    mensagem.writeBigUInt64BE(contador);

    const hmac = crypto
      .createHmac("sha1", chave)
      .update(mensagem)
      .digest();

    const deslocamento = hmac[hmac.length - 1] & 15;
    const numero = hmac.readUInt32BE(deslocamento) & 0x7fffffff;
    const esperado = String(numero % 1000000).padStart(6, "0");

    if (
      crypto.timingSafeEqual(
        Buffer.from(esperado),
        Buffer.from(String(codigo))
      )
    ) {
      return true;
    }
  }

  return false;
}

function autenticar(req, res, next) {
    const autorizacao = req.headers.authorization;

    if (!autorizacao) {
        return res.status(401).json({
            mensagem: "Acesso não autorizado. Faça login."
        });
    }

    const partes = autorizacao.split(" ");

    if (partes.length !== 2 || partes[0] !== "Bearer") {
        return res.status(401).json({
            mensagem: "Token inválido."
        });
    }

    const token = partes[1];

    try {
        const usuario = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.usuario = usuario;

        next();

    } catch (erro) {
        return res.status(401).json({
            mensagem: "Token inválido ou expirado."
        });
    }
}

function somenteAdmin(req, res, next) {

    if (req.usuario.perfil !== "admin") {
        return res.status(403).json({
            mensagem: "Acesso permitido somente para administradores."
        });
    }

    next();
}


app.get("/", (req, res) => {
    res.json({
        mensagem: "Backend do Sistema de Apoio Bibliográfico para PFCs funcionando."
    });
});


app.post("/usuarios", async (req, res) => {

    try {

        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({
                mensagem: "Nome, e-mail e senha são obrigatórios."
            });
        }

        if (senha.length < 8) {
            return res.status(400).json({
                mensagem: "A senha deve possuir pelo menos 8 caracteres."
            });
        }

        const [usuarioExistente] = await pool.execute(
            "SELECT id FROM usuarios WHERE email = ?",
            [email]
        );

        if (usuarioExistente.length > 0) {
            return res.status(409).json({
                mensagem: "Este e-mail já está cadastrado."
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

       const [resultado] = await pool.execute(
         `INSERT INTO usuarios
        (nome, email, senha_hash, perfil,
        aceite_termo, aceite_privacidade, data_aceite)
        VALUES (?, ?, ?, 'aluno', 1, 1, CURRENT_TIMESTAMP)`,
        [nome, email, senhaHash]
        );
        
        await registrarAuditoria(
            resultado.insertId,
            "CADASTRO_USUARIO",
            "Novo usuário cadastrado."
        );

        res.status(201).json({
            mensagem: "Usuário cadastrado com sucesso.",
            id: resultado.insertId
        });

    } catch (erro) {

        console.error("Erro ao cadastrar usuário:", erro);

        res.status(500).json({
            mensagem: "Erro interno ao cadastrar usuário."
        });
    }
});


app.post("/login", async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                mensagem: "E-mail e senha são obrigatórios."
            });
        }

        const [usuarios] = await pool.execute(
            `SELECT id, nome, email, senha_hash, perfil,
                    dois_fatores_ativo, dois_fatores_secret
             FROM usuarios
             WHERE email = ?`,
            [email]
        );

        if (usuarios.length === 0) {
            await registrarAuditoria(
                null,
                "LOGIN_FALHA",
                "Tentativa de login sem conta correspondente."
            );

            return res.status(401).json({
                mensagem: "E-mail ou senha incorretos."
            });
        }

        const usuario = usuarios[0];

        const senhaValida = await bcrypt.compare(
            senha,
            usuario.senha_hash
        );

        if (!senhaValida) {
            await registrarAuditoria(
                usuario.id,
                "LOGIN_FALHA",
                "Senha incorreta."
            );

            return res.status(401).json({
                mensagem: "E-mail ou senha incorretos."
            });
        }

        // Se o 2FA estiver ativado, solicita o código antes de emitir o token.
        if (usuario.dois_fatores_ativo) {
            const desafio = jwt.sign(
                { id: usuario.id, finalidade: "2fa" },
                process.env.JWT_SECRET,
                { expiresIn: "5m" }
            );

            return res.json({
                requer2fa: true,
                desafio,
                mensagem: "Informe o código do aplicativo autenticador."
            });
        }

        const token = gerarToken(usuario);

        await pool.execute(
            `UPDATE usuarios
             SET ultimo_login = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [usuario.id]
        );

        await registrarAuditoria(
            usuario.id,
            "LOGIN",
            "Login realizado com sucesso."
        );

        return res.json({
            mensagem: "Login realizado com sucesso.",
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil
            }
        });
    } catch (erro) {
        console.error("Erro no login:", erro);

        return res.status(500).json({
            mensagem: "Erro interno ao realizar login."
        });
    }
});

app.post("/login/2fa", async (req, res) => {
    try {
        const { desafio, codigo } = req.body;

        if (!desafio || !codigo) {
            return res.status(400).json({
                mensagem: "Desafio e código são obrigatórios."
            });
        }

        const dadosDesafio = jwt.verify(
            desafio,
            process.env.JWT_SECRET
        );

        if (dadosDesafio.finalidade !== "2fa") {
            return res.status(401).json({
                mensagem: "Desafio inválido."
            });
        }

        const [usuarios] = await pool.execute(
            `SELECT id, nome, email, perfil, dois_fatores_secret
             FROM usuarios
             WHERE id = ? AND dois_fatores_ativo = 1`,
            [dadosDesafio.id]
        );

        const usuario = usuarios[0];

        if (
            !usuario ||
            !validarCodigoTotp(usuario.dois_fatores_secret, codigo)
        ) {
            await registrarAuditoria(
                dadosDesafio.id,
                "LOGIN_2FA_FALHA",
                "Código autenticador inválido."
            );

            return res.status(401).json({
                mensagem: "Código inválido ou expirado."
            });
        }

        await pool.execute(
            `UPDATE usuarios
             SET ultimo_login = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [usuario.id]
        );

        await registrarAuditoria(
            usuario.id,
            "LOGIN_2FA",
            "Login com segundo fator realizado."
        );

        return res.json({
            mensagem: "Login realizado com sucesso.",
            token: gerarToken(usuario),
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil
            }
        });
    } catch (erro) {
        return res.status(401).json({
            mensagem: "Desafio inválido ou expirado."
        });
    }
});

app.post("/logout", autenticar, async (req, res) => {

    await registrarAuditoria(
        req.usuario.id,
        "LOGOUT",
        "Usuário encerrou a sessão."
    );

    res.json({
        mensagem: "Logout realizado com sucesso."
    });
});


app.get("/me", autenticar, async (req, res) => {

    try {

        const [usuarios] = await pool.execute(
            `SELECT id, nome, email, perfil, criado_em, ultimo_login
             FROM usuarios
             WHERE id = ?`,
            [req.usuario.id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                mensagem: "Usuário não encontrado."
            });
        }

        res.json(usuarios[0]);

    } catch (erro) {

        console.error("Erro ao consultar usuário:", erro);

        res.status(500).json({
            mensagem: "Erro interno."
        });
    }
});


app.post("/me/2fa/iniciar", autenticar, async (req, res) => {
  try {
    const segredo = gerarSegredoTotp();

    await pool.execute(
      `UPDATE usuarios
       SET dois_fatores_secret_pendente = ?
       WHERE id = ?`,
      [segredo, req.usuario.id]
    );

    const [usuarios] = await pool.execute(
      "SELECT email FROM usuarios WHERE id = ?",
      [req.usuario.id]
    );

    const email = encodeURIComponent(usuarios[0].email);
    const uri =
      `otpauth://totp/PFC:${email}?secret=${segredo}&issuer=PFC&algorithm=SHA1&digits=6&period=30`;

    await registrarAuditoria(
      req.usuario.id,
      "2FA_CONFIGURACAO_INICIADA",
      "Configuração do autenticador iniciada."
    );

    res.json({
      segredo,
      uri,
      mensagem: "Adicione a chave ao aplicativo autenticador e informe o código para confirmar."
    });
  } catch (erro) {
    console.error("Erro ao iniciar configuração do 2FA:", erro.message);
    res.status(500).json({ mensagem: "Não foi possível iniciar o 2FA." });
  }
});

app.post("/me/2fa/confirmar", autenticar, async (req, res) => {
  try {
    const [usuarios] = await pool.execute(
      `SELECT dois_fatores_secret_pendente
       FROM usuarios
       WHERE id = ?`,
      [req.usuario.id]
    );

    const segredo = usuarios[0]?.dois_fatores_secret_pendente;

    if (!segredo || !validarCodigoTotp(segredo, req.body.codigo)) {
      return res.status(400).json({
        mensagem: "Código inválido. Confira o aplicativo e tente novamente."
      });
    }

    await pool.execute(
      `UPDATE usuarios
       SET dois_fatores_secret = ?,
           dois_fatores_secret_pendente = NULL,
           dois_fatores_ativo = 1
       WHERE id = ?`,
      [segredo, req.usuario.id]
    );

    await registrarAuditoria(
      req.usuario.id,
      "2FA_HABILITADO",
      "Autenticação em dois fatores habilitada."
    );

    res.json({ mensagem: "2FA habilitado com sucesso." });
  } catch (erro) {
    console.error("Erro ao confirmar o 2FA:", erro.message);
    res.status(500).json({ mensagem: "Não foi possível confirmar o 2FA." });
  }
});

app.post("/pfc", autenticar, async (req, res) => {

    try {

        const {
            nome_aluno,
            curso,
            disciplina,
            tema,
            area_conhecimento,
            palavras_chave
        } = req.body;

        if (
            !nome_aluno ||
            !curso ||
            !disciplina ||
            !tema ||
            !area_conhecimento ||
            !palavras_chave
        ) {
            return res.status(400).json({
                mensagem: "Todos os campos do PFC são obrigatórios."
            });
        }

        const [resultado] = await pool.execute(
            `INSERT INTO cadastro
            (
                nome_aluno,
                curso,
                disciplina,
                tema,
                area_conhecimento,
                palavras_chave,
                usuario_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                nome_aluno,
                curso,
                disciplina,
                tema,
                area_conhecimento,
                palavras_chave,
                req.usuario.id
            ]
        );

        await registrarAuditoria(
            req.usuario.id,
            "CADASTRO_PFC",
            `PFC cadastrado. ID: ${resultado.insertId}`
        );

        res.status(201).json({
            mensagem: "PFC cadastrado com sucesso.",
            id: resultado.insertId
        });

    } catch (erro) {

        console.error("Erro ao cadastrar PFC:", erro);

        res.status(500).json({
            mensagem: "Erro interno ao cadastrar PFC."
        });
    }
});


app.get("/meus-pfcs", autenticar, async (req, res) => {

    try {

        const [pfcs] = await pool.execute(
            `SELECT
                id,
                nome_aluno,
                curso,
                disciplina,
                tema,
                area_conhecimento,
                palavras_chave
             FROM cadastro
             WHERE usuario_id = ?
             ORDER BY id DESC`,
            [req.usuario.id]
        );

        await registrarAuditoria(
            req.usuario.id,
            "CONSULTA_PFCS",
            "Usuário consultou seus PFCs."
        );

        res.json(pfcs);

    } catch (erro) {

        console.error("Erro ao consultar PFCs:", erro);

        res.status(500).json({
            mensagem: "Erro interno ao consultar PFCs."
        });
    }
});


app.get("/api/bibliografia", autenticar, async (req, res) => {

    try {

        const tema = req.query.tema;

        if (!tema) {
            return res.status(400).json({
                mensagem: "Informe um tema para realizar a busca."
            });
        }

        const url =
            `https://api.openalex.org/works?search=${encodeURIComponent(tema)}&per-page=10`;

        const resposta = await fetch(url);

        if (!resposta.ok) {
            throw new Error(
                `OpenAlex retornou status ${resposta.status}`
            );
        }

        const dados = await resposta.json();

        const resultados = dados.results.map((item) => {

            const autores = item.authorships
                ?.map((autor) => autor.author?.display_name)
                .filter(Boolean)
                .join(", ");

            return {
                titulo: item.title,
                autores: autores || "Autor não informado",
                ano: item.publication_year,
                doi: item.doi || "Não informado",
                url: item.id
            };
        });

        await registrarAuditoria(
            req.usuario.id,
            "BUSCA_BIBLIOGRAFICA",
            `Busca realizada: ${tema}`
        );

        res.json({
            tema: tema,
            resultados: resultados
        });

    } catch (erro) {

        console.error("Erro na busca bibliográfica:", erro);

        res.status(500).json({
            mensagem: "Erro ao consultar a API bibliográfica."
        });
    }
});


app.get("/admin/auditoria", autenticar, somenteAdmin, async (req, res) => {

    try {

        const [registros] = await pool.execute(
            `SELECT
                auditoria.id,
                auditoria.usuario_id,
                usuarios.nome,
                usuarios.email,
                auditoria.acao,
                auditoria.detalhes,
                auditoria.data_hora
             FROM auditoria
             LEFT JOIN usuarios
             ON auditoria.usuario_id = usuarios.id
             ORDER BY auditoria.data_hora DESC`
        );

        await registrarAuditoria(
            req.usuario.id,
            "CONSULTA_AUDITORIA",
            "Administrador consultou os logs de auditoria."
        );

        res.json(registros);

    } catch (erro) {

        console.error("Erro ao consultar auditoria:", erro);

        res.status(500).json({
            mensagem: "Erro ao consultar os logs."
        });
    }
});


app.get("/admin/teste", autenticar, somenteAdmin, (req, res) => {

    res.json({
        mensagem: "Acesso administrativo autorizado.",
        usuario: req.usuario
    });
});


async function iniciarServidor() {

    try {

        await pool.query("SELECT 1");

        console.log("Banco de dados conectado com sucesso.");

        app.listen(PORT, () => {
            console.log(`Servidor funcionando em http://localhost:${PORT}`);
        });

    } catch (erro) {

        console.error(
            "Não foi possível conectar ao banco de dados:",
            erro.message
        );

        process.exit(1);
    }
}

iniciarServidor();
