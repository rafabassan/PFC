const formulario = document.getElementById("formPfc");
const mensagem = document.getElementById("mensagem");

formulario.addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const dados = {
        nome_aluno: document.getElementById("nome_aluno").value,
        curso: document.getElementById("curso").value,
        disciplina: document.getElementById("disciplina").value,
        tema: document.getElementById("tema").value,
        area_conhecimento: document.getElementById("area_conhecimento").value,
        palavras_chave: document.getElementById("palavras_chave").value
    };

    try {
        const resposta = await fetch("http://localhost:3000/pfc", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dados)
        });

        const resultado = await resposta.json();

        if (resposta.ok) {
            mensagem.textContent = resultado.mensagem + " ID: " + resultado.id;
            formulario.reset();
        } else {
            mensagem.textContent = resultado.mensagem;
        }

    } catch (erro) {
        console.error(erro);
        mensagem.textContent = "Não foi possível conectar ao servidor.";
    }
});