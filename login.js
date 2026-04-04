document.addEventListener("DOMContentLoaded", function(){

const usuarios = [
    { user: "admin", pass: "1234" },
    { user: "tractorbel", pass: "2026" }
];

window.login = function() {
    const usuario = document.getElementById("usuario").value.trim().toLowerCase();
    const senha = document.getElementById("senha").value.trim();

    const valido = usuarios.find(
        u => u.user.toLowerCase() === usuario && u.pass === senha
    );

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

if(localStorage.getItem("logado") === "sim"){
    mostrarConteudo();
}

});