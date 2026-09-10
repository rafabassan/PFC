Sistema de Apoio Bibliográfico para PFCs
Sobre o projeto

O Sistema de Apoio Bibliográfico para PFCs é uma aplicação desenvolvida para auxiliar estudantes durante a elaboração de seus Projetos de Final de Curso.

O sistema permite cadastrar informações sobre o PFC e, posteriormente, realizar pesquisas por materiais bibliográficos relacionados ao tema, facilitando a localização e organização de fontes acadêmicas.

Objetivo

O objetivo do sistema é facilitar o processo de pesquisa bibliográfica dos estudantes, permitindo que informações como tema, disciplina, curso, área de conhecimento e palavras-chave sejam utilizadas para encontrar materiais relacionados ao PFC.

Funcionalidades
1. Cadastro do PFC

O aluno poderá cadastrar:

Nome do aluno;
Curso;
Disciplina;
Tema do PFC;
Área de conhecimento;
Palavras-chave.
2. Pesquisa de materiais

O sistema permitirá pesquisar materiais relacionados ao tema do PFC, como:

Livros;
Artigos científicos;
Trabalhos acadêmicos;
TCCs;
PFCs anteriores.
3. Organização de referências

O estudante poderá consultar e organizar informações dos materiais encontrados, como:

Título;
Autor;
Ano;
Tipo de material;
Palavras-chave;
Referência bibliográfica.
Tecnologias utilizadas
Front-end
HTML5
CSS3
JavaScript
Back-end
Node.js
Express
Banco de dados
MySQL
Estrutura do projeto
sistema-pfc/
│
├── backend/
│   ├── server.js
│   └── package.json
│
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js
Banco de dados

O projeto utiliza o MySQL para armazenar as informações dos Projetos de Final de Curso.

Banco utilizado:

sistema_pfc

Tabela principal:

pfc

A tabela armazena informações como nome do aluno, curso, disciplina, tema, área de conhecimento e palavras-chave.

Como executar o projeto
1. Criar o banco de dados

Abra o MySQL e execute o script de criação do banco e da tabela.

2. Instalar as dependências

Abra o terminal na pasta backend:

cd backend

Depois execute:

npm install
3. Configurar o banco

No arquivo server.js, informe os dados de acesso ao seu MySQL:

const banco = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "SUA_SENHA",
    database: "sistema_pfc"
});

Substitua SUA_SENHA pela senha configurada no seu MySQL.

4. Iniciar o servidor

Ainda dentro da pasta backend, execute:

npm start

O servidor será iniciado em:

http://localhost:3000
5. Executar o front-end

Abra o arquivo:

frontend/index.html

no navegador.

Fluxo do sistema
Aluno
  ↓
Cadastro do PFC
  ↓
Tema + Palavras-chave
  ↓
Sistema realiza a pesquisa
  ↓
Materiais relacionados
  ↓
Organização das referências
Público-alvo

O sistema é destinado principalmente a estudantes que estão desenvolvendo Projetos de Final de Curso, podendo também servir como ferramenta de apoio para orientadores durante o acompanhamento das pesquisas.

Finalidade acadêmica

O projeto foi desenvolvido como uma proposta de ferramenta tecnológica para auxiliar no levantamento bibliográfico e na organização de informações utilizadas durante a elaboração de PFCs.
