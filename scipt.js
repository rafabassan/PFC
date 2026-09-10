document.getElementById("formPfc").addEventListener("submit", function(event) {

    event.preventDefault();

    const dados = {
        nome_aluno: document.getElementById("nome_aluno").value,
        curso: document.getElementById("curso").value,
        disciplina: document.getElementById("disciplina").value,
        tema: document.getElementById("tema").value,
        area_conhecimento: document.getElementById("area_conhecimento").value,
        palavras_chave: document.getElementById("palavras_chave").value
    };

    fetch("http://localhost:3000/pfc", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(dados)

    })
    .then(function(resposta) {
        return resposta.json();
    })
    .then(function(resultado) {

        document.getElementById("mensagem").innerText =
            resultado.mensagem;

        document.getElementById("formPfc").reset();

    })
    .catch(function(erro) {

        console.log(erro);

        document.getElementById("mensagem").innerText =
            "Erro ao conectar com o servidor.";

    });

});