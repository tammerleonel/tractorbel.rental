const usuarios = [
    { user: "admin", pass: "tammerl" },
    { user: "tractorbel", pass: "mauricio" }
];

function login() {
    const usuario = document.getElementById("usuario").value;
    const senha = document.getElementById("senha").value;

    const valido = usuarios.find(u => u.user === usuario && u.pass === senha);

    if(valido){
        localStorage.setItem("logado","sim");
        mostrarConteudo();
    }else{
        alert("Usuário ou senha incorretos");
    }
}

function mostrarConteudo(){
    document.getElementById("login").style.display = "none";
    document.getElementById("conteudo").style.display = "block";
}

window.onload = function(){
    if(localStorage.getItem("logado") === "sim"){
        mostrarConteudo();
    }
}