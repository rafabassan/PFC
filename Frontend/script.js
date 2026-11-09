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

    const dashboard = $("areaDashboard");

    if (dashboard) {
        dashboard.style.display =
            usuario.perfil === "admin" ? "block" : "none";
    }

const areaAdminPfcs = $("areaAdminPfcs");

if (areaAdminPfcs) {
    areaAdminPfcs.style.display =
        usuario.perfil === "admin" ? "block" : "none";
}
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
    email: $("email").value.trim().toLowerCase(),
    senha: $("senha").value,
    aceite_termo: $("aceite_termo").checked,
    aceite_privacidade: $("aceite_privacidade").checked
};

if (!dados.aceite_termo || !dados.aceite_privacidade) {
    mensagemCadastro.textContent =
        "Você precisa aceitar o Termo de Aceite e a Política de Privacidade.";
    return;
}

if (dados.nome.length < 3) {
    mensagemCadastro.textContent =
        "O nome deve possuir pelo menos 3 caracteres.";
    return;
}

if (dados.senha.length < 8) {
    mensagemCadastro.textContent =
        "A senha deve possuir pelo menos 8 caracteres.";
    return;
}

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
        carregarDashboard();
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

    const limites = {
        nome_aluno: [3, 100],
        curso: [2, 100],
        disciplina: [2, 100],
        tema: [5, 200],
        area_conhecimento: [3, 100],
        palavras_chave: [3, 300]
    };

    for (const campo in dados) {
        const [minimo, maximo] = limites[campo];

        if (dados[campo].length < minimo) {
            mensagem.textContent =
                `O campo ${campo} deve ter pelo menos ${minimo} caracteres.`;
            return;
        }

        if (dados[campo].length > maximo) {
            mensagem.textContent =
                `O campo ${campo} deve ter no máximo ${maximo} caracteres.`;
            return;
        }
    }

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

/* Carregar indicadores do Dashboard */
async function carregarDashboard() {
    const token = obterToken();

    if (!token) {
        return;
    }

    const mensagemDashboard = $("mensagemDashboard");
    const graficoCursos = $("graficoCursos");

    mensagemDashboard.textContent = "Carregando indicadores...";

    try {
        const resposta = await fetch(`${API}/dashboard`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const dados = await lerResposta(resposta);

        if (!resposta.ok) {
            mensagemDashboard.textContent =
                dados.mensagem || "Erro ao carregar Dashboard.";
            return;
        }

        $("totalUsuarios").textContent = dados.totalUsuarios;
        $("totalPfcs").textContent = dados.totalPfcs;
        $("totalBuscas").textContent = dados.totalBuscas;

        graficoCursos.replaceChildren();

        const cursos = dados.pfcsPorCurso || [];

        if (cursos.length === 0) {
            graficoCursos.textContent =
                "Nenhum PFC cadastrado ainda.";
        } else {
            const maiorTotal = Math.max(
                ...cursos.map(item => Number(item.total))
            );

            cursos.forEach(function(item) {
                const div = document.createElement("div");
                div.className = "barra-curso";

                const titulo = document.createElement("p");
                titulo.textContent =
                    `${item.curso}: ${item.total} PFC(s)`;

                const fundo = document.createElement("div");
                fundo.className = "barra-fundo";

                const barra = document.createElement("div");
                barra.className = "barra-preenchida";

                const percentual =
                    (Number(item.total) / maiorTotal) * 100;

                barra.style.width = `${percentual}%`;

                fundo.appendChild(barra);
                div.appendChild(titulo);
                div.appendChild(fundo);
                graficoCursos.appendChild(div);
            });
        }

        mensagemDashboard.textContent = "";

    } catch (erro) {
        console.error("Erro no Dashboard:", erro);
        mensagemDashboard.textContent =
            "Não foi possível conectar ao servidor.";
    }
}

/* Consultar todos os PFCs - Administrador */
const btnAdminPfcs = $("btnAdminPfcs");

if (btnAdminPfcs) {
    btnAdminPfcs.addEventListener("click", async function() {
        const token = obterToken();
        const lista = $("listaAdminPfcs");
        const mensagemAdmin = $("mensagemAdminPfcs");

        lista.replaceChildren();
        mensagemAdmin.textContent = "Carregando projetos...";

        try {
            const resposta = await fetch(`${API}/admin/pfcs`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const dados = await lerResposta(resposta);

            if (!resposta.ok) {
                mensagemAdmin.textContent =
                    dados.mensagem || "Erro ao consultar PFCs.";
                return;
            }

            if (!Array.isArray(dados) || dados.length === 0) {
                mensagemAdmin.textContent =
                    "Nenhum PFC cadastrado.";
                return;
            }

            const tabela = document.createElement("table");

            const cabecalho = document.createElement("tr");

            ["ID", "Aluno", "Curso", "Tema", "Responsável"].forEach(function(titulo) {
                const th = document.createElement("th");
                th.textContent = titulo;
                cabecalho.appendChild(th);
            });

            tabela.appendChild(cabecalho);

            dados.forEach(function(pfc) {
                const linha = document.createElement("tr");

                [
                    pfc.id,
                    pfc.nome_aluno,
                    pfc.curso,
                    pfc.tema,
                    pfc.usuario_responsavel || "Não informado"
                ].forEach(function(valor) {
                    const td = document.createElement("td");
                    td.textContent = valor ?? "";
                    linha.appendChild(td);
                });

                tabela.appendChild(linha);
            });

            lista.appendChild(tabela);
            mensagemAdmin.textContent =
                `${dados.length} projeto(s) encontrado(s).`;

        } catch (erro) {
            console.error("Erro ao consultar PFCs:", erro);
            mensagemAdmin.textContent =
                "Não foi possível conectar ao servidor.";
        }
    });
}

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
        carregarDashboard();
    } catch (erro) {
        console.error("Erro ao carregar usuário:", erro);
        mostrarLogin();
    }
}


carregarUsuario();