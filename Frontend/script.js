const API = "http://localhost:3000";

const areaLogin = document.getElementById("areaLogin");
const areaCadastroUsuario = document.getElementById("areaCadastroUsuario");
const areaSistema = document.getElementById("areaSistema");

const formLogin = document.getElementById("formLogin");
const formUsuario = document.getElementById("formUsuario");
const formPfc = document.getElementById("formPfc");

const mensagemLogin = document.getElementById("mensagemLogin");
const mensagemCadastro = document.getElementById("mensagemCadastro");
const mensagem = document.getElementById("mensagem");

const usuarioLogado = document.getElementById("usuarioLogado");
const logoutBtn = document.getElementById("logoutBtn");

const btnMeusPfcs = document.getElementById("btnMeusPfcs");
const meusPfcs = document.getElementById("meusPfcs");

const formBusca = document.getElementById("formBusca");
const resultadosBibliografia = document.getElementById("resultadosBibliografia");

function obterToken() {
    return sessionStorage.getItem("token");
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

        const usuario = await resposta.json();
        mostrarSistema(usuario);

    } catch (erro) {
        console.error(erro);
        mostrarLogin();
    }
}

formUsuario.addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const dados = {
        nome: document.getElementById("nome").value,
        email: document.getElementById("email").value,
        senha: document.getElementById("senha").value
    };

    try {
        const resposta = await fetch(`${API}/usuarios`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dados)
        });

        const resultado = await resposta.json();

        mensagemCadastro.textContent = resultado.mensagem;

        if (resposta.ok) {
            formUsuario.reset();
        }

    } catch (erro) {
        console.error(erro);
        mensagemCadastro.textContent =
            "Não foi possível conectar ao servidor.";
    }
});

formLogin.addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const dados = {
        email: document.getElementById("emailLogin").value,
        senha: document.getElementById("senhaLogin").value
    };

    try {
        const resposta = await fetch(`${API}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dados)
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            mensagemLogin.textContent = resultado.mensagem;
            return;
        }

        sessionStorage.setItem("token", resultado.token);

        mensagemLogin.textContent = "";

        mostrarSistema(resultado.usuario);

        formLogin.reset();

    } catch (erro) {
        console.error(erro);
        mensagemLogin.textContent =
            "Não foi possível conectar ao servidor.";
    }
});

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
        console.error(erro);
    }

    sessionStorage.removeItem("token");

    mostrarLogin();

    mensagemLogin.textContent = "Sessão encerrada.";
});

formPfc.addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const token = obterToken();

    if (!token) {
        mensagem.textContent = "Faça login para cadastrar um PFC.";
        return;
    }

    const dados = {
        nome_aluno: document.getElementById("nome_aluno").value,
        curso: document.getElementById("curso").value,
        disciplina: document.getElementById("disciplina").value,
        tema: document.getElementById("tema").value,
        area_conhecimento: document.getElementById("area_conhecimento").value,
        palavras_chave: document.getElementById("palavras_chave").value
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

        const resultado = await resposta.json();

        if (resposta.ok) {
            mensagem.textContent =
                resultado.mensagem + " ID: " + resultado.id;

            formPfc.reset();
        } else {
            mensagem.textContent = resultado.mensagem;
        }

    } catch (erro) {
        console.error(erro);
        mensagem.textContent =
            "Não foi possível conectar ao servidor.";
    }
});

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

        const dados = await resposta.json();

        if (!resposta.ok) {
            meusPfcs.textContent = dados.mensagem;
            return;
        }

        if (dados.length === 0) {
            meusPfcs.innerHTML = "<p>Nenhum PFC cadastrado.</p>";
            return;
        }

        meusPfcs.innerHTML = "";

        dados.forEach(function(pfc) {
            const div = document.createElement("div");

            div.innerHTML = `
                <h3>${pfc.tema}</h3>
                <p><strong>Aluno:</strong> ${pfc.nome_aluno}</p>
                <p><strong>Curso:</strong> ${pfc.curso}</p>
                <p><strong>Disciplina:</strong> ${pfc.disciplina}</p>
                <p><strong>Área:</strong> ${pfc.area_conhecimento}</p>
                <p><strong>Palavras-chave:</strong> ${pfc.palavras_chave}</p>
                <hr>
            `;

            meusPfcs.appendChild(div);
        });

    } catch (erro) {
        console.error(erro);
        meusPfcs.textContent =
            "Não foi possível consultar os PFCs.";
    }
});

formBusca.addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const token = obterToken();
    const tema = document.getElementById("temaBusca").value.trim();

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

    resultadosBibliografia.innerHTML =
        "<p>Buscando referências...</p>";

    try {
        const resposta = await fetch(
            `${API}/api/bibliografia?tema=${encodeURIComponent(tema)}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            resultadosBibliografia.textContent =
                dados.mensagem || "Erro ao realizar a busca.";
            return;
        }

        const resultados = dados.resultados || [];

        if (resultados.length === 0) {
            resultadosBibliografia.innerHTML =
                "<p>Nenhuma referência encontrada.</p>";
            return;
        }

        resultadosBibliografia.innerHTML = "";

        resultados.forEach(function(item) {
            const div = document.createElement("div");

            div.innerHTML = `
                <h3>${item.titulo || "Título não informado"}</h3>
                <p>
                    <strong>Autores:</strong>
                    ${item.autores || "Autor não informado"}
                </p>
                <p>
                    <strong>Ano:</strong>
                    ${item.ano || "Ano não informado"}
                </p>
                <p>
                    <strong>DOI:</strong>
                    ${item.doi || "Não informado"}
                </p>
                <p>
                    <a href="${item.url}" target="_blank">
                        Ver publicação
                    </a>
                </p>
                <hr>
            `;

            resultadosBibliografia.appendChild(div);
        });

    } catch (erro) {
        console.error("Erro na busca:", erro);

        resultadosBibliografia.innerHTML =
            "<p>Não foi possível realizar a busca.</p>";
    }
});

carregarUsuario();