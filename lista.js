/* ======================================================
   ELEMENTOS
====================================================== */

const listasContainer =
  document.getElementById("listasContainer");

const btnNovaLista =
  document.getElementById("btnNovaLista");

const btnDesfazer =
  document.getElementById("btnDesfazer");

const btnRefazer =
  document.getElementById("btnRefazer");

const btnCompartilhar =
  document.getElementById("btnCompartilhar");

const btnPix =
  document.getElementById("btnPix");

const campoData =
  document.getElementById("campoData");

const campoLocal =
  document.getElementById("campoLocal");

const campoValor =
  document.getElementById("campoValor");

/* ======================================================
   CONFIGURAÇÃO
====================================================== */

const chavePix =
  "18e978ec-bc4b-43f1-bfdf-3647044be55f";

const API_URL =
  "https://script.google.com/macros/s/AKfycbxhFTSrHY6bPDT4aLLpcfWJq3r90_rWV30rc1JYwsbv9jlgTiz6-g1CR_TScyX3-LxxoQ/exec";

/* ======================================================
   ESTADO
====================================================== */

let listas     = [];
let contador   = 0;
let carregando = true;

const undoStack = [];
const redoStack = [];

/* ======================================================
   PIX
====================================================== */

btnPix.addEventListener("click", () => {

  navigator.clipboard
    .writeText(chavePix)
    .catch(() => {});

  alert("CHAVE PIX COPIADA ✅\n\n" + chavePix);
});

/* ======================================================
   HISTÓRICO
====================================================== */

function salvarHistorico() {

  undoStack.push(JSON.stringify(listas));

  if (undoStack.length > 100) undoStack.shift();

  redoStack.length = 0;
}

function desfazer() {

  if (undoStack.length <= 1) return;

  redoStack.push(JSON.stringify(listas));
  undoStack.pop();

  listas = JSON.parse(undoStack[undoStack.length - 1]);

  renderizar();
  salvarGoogleSheets();
}

function refazer() {

  if (redoStack.length === 0) return;

  undoStack.push(JSON.stringify(listas));

  listas = JSON.parse(redoStack.pop());

  renderizar();
  salvarGoogleSheets();
}

btnDesfazer.addEventListener("click", desfazer);
btnRefazer.addEventListener("click", refazer);

/* ======================================================
   GOOGLE SHEETS — GET via JSONP
   (evita bloqueio de CORS)
====================================================== */

function carregarGoogleSheets() {

  carregando = true;

  /* Cria tag <script> dinâmica com callback JSONP */
  const nomeCallback = "jsonpCallback_" + Date.now();

  window[nomeCallback] = function(json) {

    try {

      /* ---------- INFO ---------- */
      if (json.info) {
        campoData.value  = json.info.DATA  || "";
        campoLocal.value = json.info.LOCAL || "";
        campoValor.value = json.info.VALOR || "";
      }

      /* ---------- LISTAS ---------- */
      const listasApi = json.listas || [];

      if (listasApi.length > 0) {

        listas = listasApi.map(l => ({
          id:        Date.now() + Math.random(),
          titulo:    l.titulo || "",
          jogadores: (l.jogadores || []).map(j => ({
            nome:   j.nome   || "",
            status: j.status || "?"
          }))
        }));

      } else {

        listas = [];
        criarLista("TITULARES",        false);
        criarLista("SUPLENTES",        false);
        criarLista("GOLEIROS",         false);
        criarLista("GOLEIROS SUPLENTES", false);
        criarLista("FORA",             false);
      }

    } catch (erro) {

      console.error("Erro ao processar dados:", erro);

    } finally {

      salvarHistorico();
      renderizar();
      carregando = false;

      /* Remove o script e limpa o callback */
      delete window[nomeCallback];
      const tag = document.getElementById(nomeCallback);
      if (tag) tag.remove();
    }
  };

  /* Timeout de segurança — se o script não responder em 10s */
  const timeout = setTimeout(() => {

    if (window[nomeCallback]) {

      console.error("Timeout ao carregar dados da planilha.");

      delete window[nomeCallback];

      if (listas.length === 0) {
        criarLista("TITULARES", false);
        criarLista("SUPLENTES", false);
        criarLista("GOLEIROS",  false);
        criarLista("FORA",      false);
      }

      salvarHistorico();
      renderizar();
      carregando = false;
    }

  }, 10000);

  /* Injeta o <script> com ?callback=nomeCallback */
  const script = document.createElement("script");
  script.id  = nomeCallback;
  script.src = API_URL + "?callback=" + nomeCallback;

  script.onerror = () => {

    clearTimeout(timeout);
    console.error("Erro ao carregar script JSONP.");

    delete window[nomeCallback];

    if (listas.length === 0) {
      criarLista("TITULARES", false);
      criarLista("SUPLENTES", false);
      criarLista("GOLEIROS",  false);
      criarLista("FORA",      false);
    }

    salvarHistorico();
    renderizar();
    carregando = false;
  };

  document.head.appendChild(script);
}

/* ======================================================
   GOOGLE SHEETS — POST via fetch
====================================================== */

async function salvarGoogleSheets() {

  if (carregando) return;

  try {

    await fetch(API_URL, {
      method:   "POST",
      redirect: "follow",
      body: JSON.stringify({
        listas,
        info: {
          data:  campoData.value,
          local: campoLocal.value,
          valor: campoValor.value
        }
      })
    });

  } catch (erro) {

    console.error("Erro ao salvar:", erro);
  }
}

/* ======================================================
   EVENTOS — campos de info
====================================================== */

campoData.addEventListener("change",  salvarGoogleSheets);
campoLocal.addEventListener("change", salvarGoogleSheets);
campoValor.addEventListener("change", salvarGoogleSheets);

/* ======================================================
   NOVA LISTA
====================================================== */

btnNovaLista.addEventListener("click", () => {
  salvarHistorico();
  criarLista();
});

function criarLista(nome = null, salvar = true) {

  contador++;

  listas.push({
    id:        Date.now() + Math.random(),
    titulo:    nome || `LISTA ${contador}`,
    jogadores: [{ nome: "", status: "?" }]
  });

  if (salvar) {
    salvarHistorico();
    salvarGoogleSheets();
  }

  renderizar();
}

/* ======================================================
   RENDERIZAR
====================================================== */

function renderizar() {

  listasContainer.innerHTML = "";

  listas.forEach((lista, listaIndex) => {

    const div = document.createElement("div");
    div.className = "lista";

    div.innerHTML = `

      <div class="listaHeader">

        <button
          class="btnExcluirLista"
          onclick="removerLista(${listaIndex})"
        >×</button>

        <input
          class="listaTitulo"
          value="${escHtml(lista.titulo)}"
          onchange="alterarTitulo(${listaIndex}, this.value)"
        >

      </div>

      <table>
        <thead>
          <tr>
            <th></th>
            <th>Nº</th>
            <th>JOGADOR</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody id="tbody-${listaIndex}">
          ${lista.jogadores.map((jogador, jogadorIndex) => `
            <tr>
              <td class="dragHandle">↕</td>
              <td class="colunaNumero">${jogadorIndex + 1}</td>
              <td>
                <input
                  type="text"
                  value="${escHtml(jogador.nome)}"
                  placeholder="Nome"
                  onchange="alterarJogador(${listaIndex}, ${jogadorIndex}, 'nome', this.value)"
                >
              </td>
              <td>
                <input
                  type="text"
                  value="${escHtml(jogador.status)}"
                  placeholder="?"
                  onchange="alterarJogador(${listaIndex}, ${jogadorIndex}, 'status', this.value)"
                >
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div class="acoes">
        <button onclick="adicionarLinha(${listaIndex})">+</button>
        <button onclick="removerLinha(${listaIndex})">−</button>
      </div>

    `;

    listasContainer.appendChild(div);
    ativarDragDrop(listaIndex);
  });
}

function escHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ======================================================
   ALTERAÇÕES
====================================================== */

function alterarTitulo(listaIndex, valor) {
  salvarHistorico();
  listas[listaIndex].titulo = valor.toUpperCase();
  salvarGoogleSheets();
}

function alterarJogador(listaIndex, jogadorIndex, campo, valor) {
  salvarHistorico();
  listas[listaIndex].jogadores[jogadorIndex][campo] = valor.toUpperCase();
  salvarGoogleSheets();
}

/* ======================================================
   LINHAS
====================================================== */

function adicionarLinha(listaIndex) {
  salvarHistorico();
  listas[listaIndex].jogadores.push({ nome: "", status: "?" });
  renderizar();
  salvarGoogleSheets();
}

function removerLinha(listaIndex) {
  if (listas[listaIndex].jogadores.length <= 1) return;
  salvarHistorico();
  listas[listaIndex].jogadores.pop();
  renderizar();
  salvarGoogleSheets();
}

/* ======================================================
   REMOVER LISTA
====================================================== */

function removerLista(listaIndex) {
  salvarHistorico();
  listas.splice(listaIndex, 1);
  renderizar();
  salvarGoogleSheets();
}

/* ======================================================
   DRAG & DROP
====================================================== */

function ativarDragDrop(listaIndex) {

  const tbody = document.getElementById(`tbody-${listaIndex}`);

  new Sortable(tbody, {
    handle:      ".dragHandle",
    group:       "listasCompartilhadas",
    animation:   180,
    ghostClass:  "sortable-ghost",
    chosenClass: "sortable-chosen",

    onStart: () => { salvarHistorico(); },

    onEnd: (evt) => {

      const origem  = Number(evt.from.id.split("-")[1]);
      const destino = Number(evt.to.id.split("-")[1]);

      const item =
        listas[origem].jogadores.splice(evt.oldIndex, 1)[0];

      listas[destino].jogadores.splice(evt.newIndex, 0, item);

      renderizar();
      salvarGoogleSheets();
    }
  });
}

/* ======================================================
   COMPARTILHAR — WhatsApp
====================================================== */

btnCompartilhar.addEventListener("click", compartilharWhatsApp);

function compartilharWhatsApp() {

  let texto = "";

  texto += "================================\n";
  texto += "    𝙲𝚄𝙿ÃO 𝙽ÃO 𝙵𝙸𝚂𝙲𝙰𝙻\n";
  texto += "================================\n\n";
  texto += `DATA: ${campoData.value}\n`;
  texto += `LOCAL: ${campoLocal.value}\n`;
  texto += `VALOR: ${campoValor.value}\n`;
  texto += "================================\n\n";

  listas.forEach(lista => {

    texto += `${lista.titulo}\n`;
    texto += "--------------------------------\n";

    lista.jogadores.forEach((jogador, index) => {

      const numero = String(index + 1).padStart(2, "0");
      const nome   = (jogador.nome || "").toUpperCase().padEnd(20, ".");
      const status = jogador.status || "?";

      texto += `${numero} ${nome} ${status}\n`;
    });

    texto += "\n";
  });

  texto += "================================\n";
  texto += "      𝙵𝚄𝚃𝙿ÃO 𝙾𝙽𝙻𝙸𝙽𝙴\n";
  texto += "================================";

  window.open(
    `https://wa.me/?text=${encodeURIComponent(texto)}`,
    "_blank"
  );
}

/* ======================================================
   INICIALIZAÇÃO
====================================================== */

carregarGoogleSheets();
