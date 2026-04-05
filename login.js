import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAAF5FLl8xawkivYCcjQGJyb2jo1_A1V7g",
  authDomain: "tractorbel-8ceb8.firebaseapp.com",
  projectId: "tractorbel-8ceb8",
  storageBucket: "tractorbel-8ceb8.firebasestorage.app",
  messagingSenderId: "720471893475",
  appId: "1:720471893475:web:e6eb1d64cae5f7aa27ecd6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ------------------- Autenticação -------------------
function mostrarConteudo(user){
  const login = document.getElementById("login");
  const conteudo = document.getElementById("conteudo");

  if(!login || !conteudo) return;

  if(user){
    login.style.display = "none";
    conteudo.style.display = "block";
  }else{
    login.style.display = "block";
    conteudo.style.display = "none";
  }
}

window.login = function() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  signInWithEmailAndPassword(auth, email, senha)
    .then(() => mostrarConteudo(true))
    .catch(() => alert("Usuário ou senha incorretos"));
};

window.logout = function() {
  signOut(auth);
};

onAuthStateChanged(auth, (user) => {
  document.addEventListener("DOMContentLoaded", ()=>{
    mostrarConteudo(user);
  });
});

// ------------------- Planilha e Gráficos -------------------
let dadosGlobais = [];
let graficos = [];

function normalizarChaves(obj){
    const novo = {};
    Object.keys(obj).forEach(k=>{
        const chave = k.trim();
        novo[chave] = obj[k];
    });
    return novo;
}

function converterNumero(valor){
    if(valor === null || valor === undefined || valor === "") return 0;
    if(typeof valor === "number") return valor;
    return parseFloat(valor.toString().replace(/\./g,'').replace(',','.')) || 0;
}

window.carregarDados = function(){
    const file = document.getElementById('upload').files[0];
    if(!file) return alert("Selecione um arquivo");

    const reader = new FileReader();
    reader.onload = function(event){
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, {type:'array'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);

        dadosGlobais = json.map(l => normalizarChaves(l));
        atualizarFiltros(dadosGlobais);
    };
    reader.readAsArrayBuffer(file);
};

document.querySelectorAll("select").forEach(s=>{
    s.addEventListener("change", ()=>{
        atualizarFiltrosFiltrados();
    });
});

window.gerarGraficos = function(){
    const filtrado = filtrarDados();
    calcularTotais(filtrado);
};

function atualizarFiltros(dados){
    preencherSelect("filtroCliente", dados, "Solicitante / Localização");
    preencherSelect("filtroTag", dados, "TAG");
    preencherSelect("filtroTipo", dados, "Tipo de Tecnologia");
    preencherSelect("filtroModelo", dados, "Modelo");
    preencherSelect("filtroSerie", dados, "Nº Série");
}

function atualizarFiltrosFiltrados(){
    const filtrado = filtrarDados();
    atualizarFiltros(filtrado);
}

function preencherSelect(id, dados, coluna){
    const select = document.getElementById(id);
    const valorAtual = select.value;
    select.innerHTML = '<option value="">Todos</option>';
    const valores = [...new Set(dados.map(l => l[coluna]).filter(v => v))];
    valores.sort().forEach(v=>{
        select.innerHTML += `<option value="${v}">${v}</option>`;
    });
    select.value = valorAtual;
}

function filtrarDados(){
    const cliente = document.getElementById("filtroCliente").value;
    const tag = document.getElementById("filtroTag").value;
    const tipo = document.getElementById("filtroTipo").value;
    const modelo = document.getElementById("filtroModelo").value;
    const serie = document.getElementById("filtroSerie").value;

    return dadosGlobais.filter(linha =>{
        return (!cliente || linha["Solicitante / Localização"] == cliente) &&
               (!tag || linha["TAG"] == tag) &&
               (!tipo || linha["Tipo de Tecnologia"] == tipo) &&
               (!modelo || linha["Modelo"] == modelo) &&
               (!serie || linha["Nº Série"] == serie);
    });
}

function calcularTotais(dados){
    const totaisModelo = {};
    const totaisCliente = {};
    let totalEquipamentos = 0;

    dados.forEach(linha => {
        const total = converterNumero(linha["Total"]);
        if(total > 0){
            totalEquipamentos++;
            const modelo = linha["Modelo"] || "Não informado";
            totaisModelo[modelo] = (totaisModelo[modelo] || 0) + 1;
            const cliente = linha["Solicitante / Localização"] || "Não informado";
            totaisCliente[cliente] = (totaisCliente[cliente] || 0) + total;
        }
    });

    document.getElementById("totalAtendimento").innerText = totalEquipamentos;

    const tbody = document.getElementById("tabelaModelos");
    tbody.innerHTML = "";
    for(const modelo in totaisModelo){
        tbody.innerHTML += `<tr><td>${modelo}</td><td>${totaisModelo[modelo]}</td></tr>`;
    }

    criarGraficosClientes(totaisCliente);
}

function criarGraficosClientes(dados){
    graficos.forEach(g => g.destroy());
    graficos = [];
    const container = document.getElementById("graficosClientes");
    container.innerHTML = "";

    for(const cliente in dados){
        const valor = dados[cliente];
        if(valor <= 0) continue;

        const card = document.createElement("div");
        card.className = "card";

        const titulo = document.createElement("h3");
        titulo.innerText = "Resultado Cliente - " + cliente;

        const canvas = document.createElement("canvas");

        card.appendChild(titulo);
        card.appendChild(canvas);
        container.appendChild(card);

        const grafico = new Chart(canvas,{
            type:'bar',
            data:{
                labels:["Total"],
                datasets:[{
                    label:"Resultado Cliente",
                    data:[valor]
                }]
            },
            options:{
                responsive:true,
                plugins:{
                    legend:{display:false}
                }
            }
        });

        graficos.push(grafico);
    }
}