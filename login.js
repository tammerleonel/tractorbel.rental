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

// ------------------- PLANILHA -------------------
let dadosGlobais = [];
let graficos = [];

function converterNumero(valor){
    if(valor === null || valor === undefined || valor === "") return 0;
    if(typeof valor === "number") return valor;
    return parseFloat(valor.toString().replace(/\./g,'').replace(',','.')) || 0;
}

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

        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, {type:'array'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet,{header:1});

        dadosGlobais = [];

        for(let i=1;i<json.length;i++){

            const l = json[i];

            let dataLinha = l[15];

            if(typeof dataLinha === "number"){
                dataLinha = new Date((dataLinha - 25569) * 86400 * 1000);
            }else{
                dataLinha = new Date(dataLinha);
            }

            if(!isNaN(dataLinha)){

                dataLinha.setHours(0,0,0,0);

                dadosGlobais.push({
                    filial:l[0],
                    patrimonio:l[1],
                    serie:l[2],
                    equipamento:l[3],
                    faturamento:converterNumero(l[7]),
                    manutencao:converterNumero(l[8]),
                    financiamento:converterNumero(l[9]),
                    impostos:converterNumero(l[10]),
                    tx:converterNumero(l[11]),
                    resultado:converterNumero(l[12]),
                    mau:converterNumero(l[13]),
                    cliente:l[14],
                    data:dataLinha
                });
            }
        }

        const datas = dadosGlobais.map(d=>d.data);

        const minData = new Date(Math.min(...datas));
        const maxData = new Date(Math.max(...datas));

        const formatar = d => {
            const m = String(d.getMonth()+1).padStart(2,'0');
            const dia = String(d.getDate()).padStart(2,'0');
            return `${d.getFullYear()}-${m}-${dia}`;
        };

        const dataInicio = document.getElementById("dataInicio");
        const dataFim = document.getElementById("dataFim");

        dataInicio.min = formatar(minData);
        dataInicio.max = formatar(maxData);
        dataFim.min = formatar(minData);
        dataFim.max = formatar(maxData);

        dataInicio.value = formatar(minData);
        dataFim.value = formatar(maxData);

        atualizarFiltros();
        status.innerText = "Dados carregados ✔";
        btnRelatorio.style.display = "inline-block";
        btnCarregar.disabled = false;
    };

    reader.readAsArrayBuffer(file);
};

// ------------------- FILTROS -------------------
function atualizarFiltros(){
    preencherSelect("filtroFilial","filial");
    preencherSelect("filtroPatrimonio","patrimonio");
    preencherSelect("filtroSerie","serie");
    preencherSelect("filtroEquipamento","equipamento");
    preencherSelect("filtroCliente","cliente");
}

function preencherSelect(id,campo){

    const select = document.getElementById(id);
    if(!select) return;

    select.multiple = true;

    const valores = [...new Set(dadosGlobais.map(d=>d[campo]).filter(Boolean))];

    select.innerHTML="";
    valores.sort();

    valores.forEach(v=>{
        const opt = document.createElement("option");
        opt.value=v;
        opt.text=v;
        select.appendChild(opt);
    });
}

function getMultiValues(select){
    if(!select) return [];
    return [...select.selectedOptions].map(o=>o.value);
}

// ------------------- RELATÓRIO -------------------
window.gerarRelatorio = function(){

    const status = document.getElementById("statusCarga");
    status.innerText = "Gerando relatório...";

    const filtrado = filtrarDados();
    calcularTotais(filtrado);
    gerarGraficos(filtrado);

    status.innerText = "Relatório gerado ✔";
};

function filtrarDados(){

    const filial = getMultiValues(document.getElementById("filtroFilial"));
    const patrimonio = getMultiValues(document.getElementById("filtroPatrimonio"));
    const serie = getMultiValues(document.getElementById("filtroSerie"));
    const equipamento = getMultiValues(document.getElementById("filtroEquipamento"));
    const cliente = getMultiValues(document.getElementById("filtroCliente"));

    const dtInicio = dataInicio.value ? new Date(dataInicio.value) : null;
    const dtFim = dataFim.value ? new Date(dataFim.value) : null;

    if(dtInicio) dtInicio.setHours(0,0,0,0);
    if(dtFim) dtFim.setHours(23,59,59,999);

    return dadosGlobais.filter(d=>
        (!filial.length || filial.includes(d.filial)) &&
        (!patrimonio.length || patrimonio.includes(d.patrimonio)) &&
        (!serie.length || serie.includes(d.serie)) &&
        (!equipamento.length || equipamento.includes(d.equipamento)) &&
        (!cliente.length || cliente.includes(d.cliente)) &&
        (!dtInicio || d.data >= dtInicio) &&
        (!dtFim || d.data <= dtFim)
    );
}

// ------------------- CARDS -------------------
function calcularTotais(dados){

    let fat=0,man=0,fin=0,imp=0,tx=0,res=0,mau=0;

    dados.forEach(d=>{
        fat+=d.faturamento;
        man+=d.manutencao;
        fin+=d.financiamento;
        imp+=d.impostos;
        tx+=d.tx;
        res+=d.resultado;
        mau+=d.mau;
    });

    document.getElementById("cardFat").innerText = fat.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    document.getElementById("cardMan").innerText = man.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    document.getElementById("cardRes").innerText = res.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    document.getElementById("cardFin").innerText = fin.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    document.getElementById("cardImp").innerText = imp.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    document.getElementById("cardTx").innerText = tx.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    document.getElementById("cardMau").innerText = mau.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}

// ------------------- GRÁFICOS -------------------
function gerarGraficos(dados){

    graficos.forEach(g=>g.destroy());
    graficos=[];

    const fatEquip={}, fatCliente={}, manCliente={}, deficitCliente={};

    dados.forEach(d=>{

        fatEquip[d.equipamento]=(fatEquip[d.equipamento]||0)+d.faturamento;
        fatCliente[d.cliente]=(fatCliente[d.cliente]||0)+d.faturamento;
        manCliente[d.cliente]=(manCliente[d.cliente]||0)+d.manutencao;

        if(d.resultado < 0){
            deficitCliente[d.cliente]=(deficitCliente[d.cliente]||0)+d.resultado;
        }
    });

    // Gráfico Faturamento x Equipamento
    graficos.push(new Chart(graficoEquipamento,{
        type:'bar',
        data:{labels:Object.keys(fatEquip),datasets:[{data:Object.values(fatEquip), backgroundColor:'blue'}]}
    }));

    // Gráfico Faturamento x Cliente
    graficos.push(new Chart(graficoCliente,{
        type:'pie',
        data:{labels:Object.keys(fatCliente),datasets:[{data:Object.values(fatCliente)}]}
    }));

    // Gráfico Manutenção x Cliente
    graficos.push(new Chart(graficoManutencao,{
        type:'pie',
        data:{labels:Object.keys(manCliente),datasets:[{data:Object.values(manCliente)}]}
    }));

    // Gráfico Déficit x Cliente (cor vermelha, valores negativos para cima)
    graficos.push(new Chart(graficoDeficit,{
        type:'bar',
        data:{
            labels:Object.keys(deficitCliente),
            datasets:[{
                data:Object.values(deficitCliente).map(v=>Math.abs(v)),
                backgroundColor:'red'
            }]
        },
        options:{
            scales:{
                y:{ beginAtZero:true },
                x:{ beginAtZero:true }
            },
            plugins:{
                legend:{ display:false },
                tooltip:{
                    callbacks:{
                        label:function(context){
                            const valorReal = Object.values(deficitCliente)[context.dataIndex];
                            return valorReal.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
                        }
                    }
                }
            }
        }
    }));
}