const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const banco = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "SUA_SENHA",
    database: "sistema_pfc"
});

banco.connect(function(erro) {
    if (erro) {
        console.log("Erro ao conectar com o banco:", erro);
        return;
    }

    console.log("Banco de dados conectado!");
});

app.post("/pfc", function(req, res) {

    const {
        nome_aluno,
        curso,
        disciplina,
        tema,
        area_conhecimento,
        palavras_chave
    } = req.body;

    const sql = `
        INSERT INTO pfc
        (nome_aluno, curso, disciplina, tema, area_conhecimento, palavras_chave)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    banco.query(
        sql,
        [
            nome_aluno,
            curso,
            disciplina,
            tema,
            area_conhecimento,
            palavras_chave
        ],
        function(erro, resultado) {

            if (erro) {
                console.log(erro);
                return res.status(500).json({
                    mensagem: "Erro ao cadastrar o PFC"
                });
            }

            res.json({
                mensagem: "PFC cadastrado com sucesso!",
                id: resultado.insertId
            });
        }
    );
});

app.listen(3000, function() {
    console.log("Servidor funcionando em http://localhost:3000");
});