const API = "http://localhost:3001";
let desafio2fa = null;

const $ = (id) => document.getElementById(id);

const areaLogin = $("areaLogin");
const areaCadastroUsuario = $("areaCadastroUsuario");
const areaSistema = $("areaSistema");

const formLogin = $("formLogin");
const formUsuario = $("formUsuario");
const formPfc = $("formPfc");
const formBusca = $("formBusca");

const mensagemLogin = $("mensagemLogin");
const mensagemCadastro = $("mensagemCadastro");
const mensagem = $("mensagem");

const usuarioLogado = $("usuarioLogado");
const logoutBtn = $("logoutBtn");
const btnMeusPfcs = $("btnMeusPfcs");
const meusPfcs = $("meusPfcs");
const resultadosBibliografia = $("resultadosBibliografia");

function obterToken() {
    return sessionStorage.getItem("token");
}

async function lerResposta(resposta) {
    try {
        return await resposta.json();
    } catch {
        return {};
    }
}

function mostrarSistema(usuario) {
    areaLogin.style.display = "none";
    areaCadastroUsuario.style.display = "none";
    areaSistema.style.display = "block";

    usuarioLogado.textContent =
        `Usuário logado: ${usuario.nome} (${usuario.email})`;
}

function mostrarLogin() {
    areaLogin.style.display = "block";
    areaCadastroUsuario.style.display = "block";
    areaSistema.style.display = "none";
}

function adicionarTexto(elementoPai, tag, texto) {
    const elemento = document.createElement(tag);
    elemento.textContent = texto;
    elementoPai.appendChild(elemento);
    return elemento;
}

/* Cadastro de usuário e registro do aceite */
formUsuario.addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const dados = {
        nome: $("nome").value.trim(),
        email: $("email").value.trim(),
        senha: $("senha").value,
        aceite: $("aceite").checked
    };

    try {
        const resposta = await fetch(`${API}/usuarios`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dados)
        });

        const textoResposta = await resposta.text();
        let resultado = {};

        try {
        resultado = JSON.parse(textoResposta);
        } catch {resultado.mensagem = textoResposta;}
        mensagemCadastro.textContent = resultado.mensagem || "";

        if (resposta.ok) {
            const emailCadastrado = dados.email;
            formUsuario.reset();
            $("emailLogin").value = emailCadastrado;
        }
    } catch (erro) {
        console.error("Erro no cadastro:", erro);
        mensagemCadastro.textContent =
            "Não foi possível conectar ao servidor.";
    }
});

/* Login: senha primeiro; código autenticador na segunda etapa */
formLogin.addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const segundaEtapa = Boolean(desafio2fa);
    const rota = segundaEtapa
        ? `${API}/login/2fa`
        : `${API}/login`;

    const dados = segundaEtapa
        ? {
            desafio: desafio2fa,
            codigo: $("codigo2fa").value.trim()
        }
        : {
            email: $("emailLogin").value.trim(),
            senha: $("senhaLogin").value
        };

    const botaoEntrar = formLogin.querySelector(
        'button[type="submit"]'
    );

    try {
        if (botaoEntrar) {
            botaoEntrar.disabled = true;
        }

        const resposta = await fetch(rota, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dados)
        });

        const resultado = await lerResposta(resposta);

        if (!resposta.ok) {mensagemLogin.textContent =
        `Diagnóstico: HTTP ${resposta.status} — ${JSON.stringify(resultado)}`;
        return;
}

        if (resultado.requer2fa) {
            desafio2fa = resultado.desafio;

            $("areaCodigo2fa").style.display = "block";
            $("codigo2fa").required = true;
            $("codigo2fa").focus();

            mensagemLogin.textContent = resultado.mensagem;
            return;
        }

        sessionStorage.setItem("token", resultado.token);
        desafio2fa = null;

        formLogin.reset();
        $("areaCodigo2fa").style.display = "none";
        $("codigo2fa").required = false;

        mensagemLogin.textContent = "";
        mostrarSistema(resultado.usuario);
    } catch (erro) {
        console.error("Erro no login:", erro);
        mensagemLogin.textContent =
            "Não foi possível conectar ao servidor.";
    } finally {
        if (botaoEntrar) {
            botaoEntrar.disabled = false;
        }
    }
});

/* Iniciar configuração do aplicativo autenticador */
const btnIniciar2fa = $("btnIniciar2fa");

if (btnIniciar2fa) {
    btnIniciar2fa.addEventListener("click", async function() {
        const mensagem2fa = $("mensagem2fa");

        try {
            const resposta = await fetch(`${API}/me/2fa/iniciar`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${obterToken()}`
                }
            });

            const resultado = await lerResposta(resposta);

            if (!resposta.ok) {
                mensagem2fa.textContent =
                    resultado.mensagem || "Não foi possível iniciar o 2FA.";
                return;
            }

            $("segredo2fa").textContent = resultado.segredo;
            $("passos2fa").style.display = "block";
            mensagem2fa.textContent =
                "Cadastre a chave no aplicativo autenticador e informe o código.";
        } catch (erro) {
            console.error("Erro ao iniciar 2FA:", erro);
            mensagem2fa.textContent =
                "Não foi possível conectar ao servidor.";
        }
    });
}

/* Confirmar e ativar o 2FA */
const formConfirmar2fa = $("formConfirmar2fa");

if (formConfirmar2fa) {
    formConfirmar2fa.addEventListener("submit", async function(evento) {
        evento.preventDefault();

        const mensagem2fa = $("mensagem2fa");
        const codigo = $("codigoConfirmacao2fa").value.trim();

        try {
            const resposta = await fetch(`${API}/me/2fa/confirmar`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${obterToken()}`
                },
                body: JSON.stringify({ codigo })
            });

            const resultado = await lerResposta(resposta);
            mensagem2fa.textContent =
                resultado.mensagem || "";

            if (resposta.ok) {
                $("passos2fa").style.display = "none";
                $("btnIniciar2fa").disabled = true;
                $("btnIniciar2fa").textContent = "2FA ativado";
            }
        } catch (erro) {
            console.error("Erro ao confirmar 2FA:", erro);
            mensagem2fa.textContent =
                "Não foi possível conectar ao servidor.";
        }
    });
}

/* Encerrar sessão */
logoutBtn.addEventListener("click", async function() {
    const token = obterToken();

    try {
        if (token) {
            await fetch(`${API}/logout`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
        }
    } catch (erro) {
        console.error("Erro ao sair:", erro);
    }

    sessionStorage.removeItem("token");
    desafio2fa = null;
    mostrarLogin();
    mensagemLogin.textContent = "Sessão encerrada.";
});

/* Cadastrar PFC */
formPfc.addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const token = obterToken();

    if (!token) {
        mensagem.textContent = "Faça login para cadastrar um PFC.";
        return;
    }

    const dados = {
        nome_aluno: $("nome_aluno").value.trim(),
        curso: $("curso").value.trim(),
        disciplina: $("disciplina").value.trim(),
        tema: $("tema").value.trim(),
        area_conhecimento: $("area_conhecimento").value.trim(),
        palavras_chave: $("palavras_chave").value.trim()
    };

    try {
        const resposta = await fetch(`${API}/pfc`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(dados)
        });

        const resultado = await lerResposta(resposta);

        if (resposta.ok) {
            mensagem.textContent =
                `${resultado.mensagem} ID: ${resultado.id}`;
            formPfc.reset();
        } else {
            mensagem.textContent =
                resultado.mensagem || "Não foi possível salvar o PFC.";
        }
    } catch (erro) {
        console.error("Erro ao cadastrar PFC:", erro);
        mensagem.textContent =
            "Não foi possível conectar ao servidor.";
    }
});

/* Consultar PFCs do usuário */
btnMeusPfcs.addEventListener("click", async function() {
    const token = obterToken();

    if (!token) {
        meusPfcs.textContent = "Faça login primeiro.";
        return;
    }

    try {
        const resposta = await fetch(`${API}/meus-pfcs`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const dados = await lerResposta(resposta);
        meusPfcs.replaceChildren();

        if (!resposta.ok) {
            meusPfcs.textContent =
                dados.mensagem || "Não foi possível consultar os PFCs.";
            return;
        }

        if (dados.length === 0) {
            adicionarTexto(meusPfcs, "p", "Nenhum PFC cadastrado.");
            return;
        }

        dados.forEach(function(pfc) {
            const div = document.createElement("div");

            adicionarTexto(div, "h3", pfc.tema);
            adicionarTexto(div, "p", `Aluno: ${pfc.nome_aluno}`);
            adicionarTexto(div, "p", `Curso: ${pfc.curso}`);
            adicionarTexto(div, "p", `Disciplina: ${pfc.disciplina}`);
            adicionarTexto(div, "p", `Área: ${pfc.area_conhecimento}`);
            adicionarTexto(div, "p", `Palavras-chave: ${pfc.palavras_chave}`);

            meusPfcs.appendChild(div);
        });
    } catch (erro) {
        console.error("Erro ao consultar PFCs:", erro);
        meusPfcs.textContent =
            "Não foi possível consultar os PFCs.";
    }
});

/* Buscar referências na API OpenAlex */
formBusca.addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const token = obterToken();
    const tema = $("temaBusca").value.trim();

    if (!token) {
        resultadosBibliografia.textContent =
            "Faça login para realizar a busca.";
        return;
    }

    if (!tema) {
        resultadosBibliografia.textContent =
            "Digite um tema ou palavra-chave.";
        return;
    }

    resultadosBibliografia.textContent = "Buscando referências...";

    try {
        const resposta = await fetch(
            `${API}/api/bibliografia?tema=${encodeURIComponent(tema)}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const dados = await lerResposta(resposta);
        resultadosBibliografia.replaceChildren();

        if (!resposta.ok) {
            resultadosBibliografia.textContent =
                dados.mensagem || "Erro ao realizar a busca.";
            return;
        }

        const resultados = dados.resultados || [];

        if (resultados.length === 0) {
            adicionarTexto(
                resultadosBibliografia,
                "p",
                "Nenhuma referência encontrada."
            );
            return;
        }

        resultados.forEach(function(item) {
            const div = document.createElement("div");

            adicionarTexto(
                div,
                "h3",
                item.titulo || "Título não informado"
            );
            adicionarTexto(
                div,
                "p",
                `Autores: ${item.autores || "Autor não informado"}`
            );
            adicionarTexto(
                div,
                "p",
                `Ano: ${item.ano || "Ano não informado"}`
            );
            adicionarTexto(
                div,
                "p",
                `DOI: ${item.doi || "Não informado"}`
            );

            if (item.url && item.url.startsWith("https://")) {
                const link = document.createElement("a");
                link.href = item.url;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.textContent = "Ver publicação";
                div.appendChild(link);
            }

            resultadosBibliografia.appendChild(div);
        });
    } catch (erro) {
        console.error("Erro na busca bibliográfica:", erro);
        resultadosBibliografia.textContent =
            "Não foi possível realizar a busca.";
    }
});

/* Restaurar a sessão ao abrir a página */
async function carregarUsuario() {
    const token = obterToken();

    if (!token) {
        mostrarLogin();
        return;
    }

    try {
        const resposta = await fetch(`${API}/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!resposta.ok) {
            sessionStorage.removeItem("token");
            mostrarLogin();
            return;
        }

        const usuario = await lerResposta(resposta);
        mostrarSistema(usuario);
    } catch (erro) {
        console.error("Erro ao carregar usuário:", erro);
        mostrarLogin();
    }
}

carregarUsuario();