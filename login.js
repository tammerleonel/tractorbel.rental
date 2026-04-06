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

// ----------- CARREGAMENTO OTIMIZADO (SEM TRAVAR) -----------
window.carregarDados = function(){

    const input = document.getElementById('upload');
    const status = document.getElementById("statusCarga");
    const btnCarregar = document.getElementById("btnCarregar");
    const btnRelatorio = document.getElementById("btnRelatorio");

    if(!input){
        alert("Input upload não encontrado");
        return;
    }

    const file = input.files[0];
    if(!file){
        alert("Selecione um arquivo");
        return;
    }

    btnCarregar.disabled = true;
    if(btnRelatorio) btnRelatorio.style.display = "none";
    if(status) status.innerText = "Carregando planilha...";

    const reader = new FileReader();

    reader.onload = function(event){

        setTimeout(function(){

            try{

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

                    if(status){
                        status.innerText = "Processando " + i + " de " + json.length;
                    }

                    if(i < json.length){
                        setTimeout(processarLote, 0);
                    }else{
                        atualizarFiltros(dadosGlobais);

                        if(status){
                            status.innerText = "Dados carregados ✔";
                        }

                        if(btnRelatorio){
                            btnRelatorio.style.display = "inline-block";
                        }

                        btnCarregar.disabled = false;
                    }
                }

                processarLote();

            }catch(e){
                btnCarregar.disabled = false;
                if(status) status.innerText = "";
                alert("Erro ao ler planilha: " + e.message);
            }

        },50);
    };

    reader.readAsArrayBuffer(file);
};

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

function preencherSelect(id, dados, coluna){

    const select = document.getElementById(id);
    if(!select) return;

    const valorAtual = select.value;
    select.innerHTML = '<option value="">Todos</option>';

    const valores = [];
    dados.forEach(function(l){
        if(l[coluna] && valores.indexOf(l[coluna]) === -1){
            valores.push(l[coluna]);
        }
    });

    valores.sort();

    valores.forEach(function(v){
        select.innerHTML += '<option value="' + v + '">' + v + '</option>';
    });

    select.value = valorAtual;
}

function filtrarDados(){

    const clienteEl = document.getElementById("filtroCliente");
    const tagEl = document.getElementById("filtroTag");
    const tipoEl = document.getElementById("filtroTipo");
    const modeloEl = document.getElementById("filtroModelo");
    const serieEl = document.getElementById("filtroSerie");

    const cliente = clienteEl ? clienteEl.value : "";
    const tag = tagEl ? tagEl.value : "";
    const tipo = tipoEl ? tipoEl.value : "";
    const modelo = modeloEl ? modeloEl.value : "";
    const serie = serieEl ? serieEl.value : "";

    return dadosGlobais.filter(function(linha){
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

    dados.forEach(function(linha){

        const total = converterNumero(linha["Total"]);

        if(total > 0){

            totalEquipamentos++;

            const modelo = linha["Modelo"] || "Não informado";
            totaisModelo[modelo] = (totaisModelo[modelo] || 0) + 1;

            const cliente = linha["Solicitante / Localização"] || "Não informado";
            totaisCliente[cliente] = (totaisCliente[cliente] || 0) + total;
        }
    });

    const totalEl = document.getElementById("totalAtendimento");
    if(totalEl) totalEl.innerText = totalEquipamentos;

    const tbody = document.getElementById("tabelaModelos");
    if(tbody){
        tbody.innerHTML = "";
        for(const modelo in totaisModelo){
            tbody.innerHTML += '<tr><td>' + modelo + '</td><td>' + totaisModelo[modelo] + '</td></tr>';
        }
    }

    criarGraficosClientes(totaisCliente);
}

function criarGraficosClientes(dados){

    graficos.forEach(function(g){ g.destroy(); });
    graficos = [];

    const container = document.getElementById("graficosClientes");
    if(!container) return;

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