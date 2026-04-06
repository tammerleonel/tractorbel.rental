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
    .then(function(){ mostrarConteudo(true); })
    .catch(function(){ alert("Usuário ou senha incorretos"); });
};

window.logout = function() {
  signOut(auth);
};

onAuthStateChanged(auth, function(user){
  mostrarConteudo(user);
});

// ------------------- Planilha e Gráficos -------------------
let dadosGlobais = [];
let graficos = [];

function normalizarChaves(obj){
    const novo = {};
    Object.keys(obj).forEach(function(k){
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

// ----------- CARREGAMENTO OTIMIZADO -----------
window.carregarDados = function(){

    const input = document.getElementById('upload');
    const status = document.getElementById("statusCarga");
    const btnCarregar = document.getElementById("btnCarregar");
    const btnRelatorio = document.getElementById("btnRelatorio");

    const file = input.files[0];
    if(!file){
        alert("Selecione um arquivo");
        return;
    }

    btnCarregar.disabled = true;
    btnRelatorio.style.display = "none";
    status.innerText = "Carregando planilha...";

    const reader = new FileReader();

    reader.onload = function(event){

        setTimeout(function(){

            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, {type:'array'});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];

            const json = XLSX.utils.sheet_to_json(sheet,{
                raw:true,
                defval:"",
                blankrows:false
            });

            dadosGlobais = [];
            let i = 0;

            function processarLote(){

                const limite = Math.min(i + 300, json.length);

                for(; i < limite; i++){
                    dadosGlobais.push(normalizarChaves(json[i]));
                }

                status.innerText = "Processando " + i + " de " + json.length;

                if(i < json.length){
                    setTimeout(processarLote, 0);
                }else{

                    atualizarFiltros(dadosGlobais);
                    status.innerText = "Dados carregados ✔";
                    btnRelatorio.style.display = "inline-block";
                    btnCarregar.disabled = false;
                }
            }

            processarLote();

        },50);
    };

    reader.readAsArrayBuffer(file);
};

// BOTÃO GERAR RELATÓRIO
window.gerarRelatorio = function(){

    const status = document.getElementById("statusCarga");
    if(status) status.innerText = "Gerando relatório...";

    setTimeout(()=>{

        const filtrado = filtrarDados();
        calcularTotais(filtrado);

        if(status) status.innerText = "Relatório gerado ✔";

    },10);
};

function atualizarFiltros(dados){
    preencherSelect("filtroCliente", dados, "Solicitante / Localização");
    preencherSelect("filtroTag", dados, "TAG");
    preencherSelect("filtroTipo", dados, "Tipo de Tecnologia");
    preencherSelect("filtroModelo", dados, "Modelo");
    preencherSelect("filtroSerie", dados, "Nº Série");
}

function preencherSelect(id, dados, coluna){

    const select = document.getElementById(id);
    if(!select) return;

    const valores = [...new Set(dados.map(l => l[coluna]).filter(Boolean))];

    select.innerHTML = "";
    valores.sort();

    valores.forEach(v=>{
        const opt = document.createElement("option");
        opt.value = v;
        opt.text = v;
        select.appendChild(opt);
    });
}

function getMultiValues(select){
    if(!select) return [];
    return [...select.selectedOptions].map(o=>o.value);
}

function filtrarDados(){

    const cliente = getMultiValues(document.getElementById("filtroCliente"));
    const tag = getMultiValues(document.getElementById("filtroTag"));
    const tipo = getMultiValues(document.getElementById("filtroTipo"));
    const modelo = getMultiValues(document.getElementById("filtroModelo"));
    const serie = getMultiValues(document.getElementById("filtroSerie"));

    const dataInicio = document.getElementById("dataInicio")?.value;
    const dataFim = document.getElementById("dataFim")?.value;

    const dtInicio = dataInicio ? new Date(dataInicio) : null;
    const dtFim = dataFim ? new Date(dataFim) : null;

    return dadosGlobais.filter(function(linha){

        const dataLinha = linha["Relatório Financeiro Mês"]
            ? new Date(linha["Relatório Financeiro Mês"])
            : null;

        return (!cliente.length || cliente.includes(linha["Solicitante / Localização"])) &&
               (!tag.length || tag.includes(linha["TAG"])) &&
               (!tipo.length || tipo.includes(linha["Tipo de Tecnologia"])) &&
               (!modelo.length || modelo.includes(linha["Modelo"])) &&
               (!serie.length || serie.includes(linha["Nº Série"])) &&
               (!dtInicio || (dataLinha && dataLinha >= dtInicio)) &&
               (!dtFim || (dataLinha && dataLinha <= dtFim));
    });
}

function calcularTotais(dados){

    const totaisCliente = {};

    dados.forEach(function(linha){

        const total = converterNumero(linha["Total"]);
        const cliente = linha["Solicitante / Localização"] || "Não informado";

        totaisCliente[cliente] = (totaisCliente[cliente] || 0) + total;
    });

    criarGraficosClientes(totaisCliente);
}

function criarGraficosClientes(dados){

    graficos.forEach(g => g.destroy());
    graficos = [];

    const container = document.getElementById("graficosClientes");
    if(!container) return;

    container.innerHTML = "";

    for(const cliente in dados){

        const card = document.createElement("div");
        card.className = "card";

        const titulo = document.createElement("h3");
        titulo.innerText = cliente;

        const canvas = document.createElement("canvas");

        card.appendChild(titulo);
        card.appendChild(canvas);
        container.appendChild(card);

        graficos.push(new Chart(canvas,{
            type:'bar',
            data:{
                labels:["Total"],
                datasets:[{
                    data:[dados[cliente]]
                }]
            },
            options:{
                responsive:true,
                plugins:{
                    legend:{display:false}
                }
            }
        }));
    }
}