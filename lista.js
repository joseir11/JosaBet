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

/* ======================================================
   PIX
====================================================== */

const chavePix =
  "18e978ec-bc4b-43f1-bfdf-3647044be55f";

/* ======================================================
   API GOOGLE
====================================================== */

const API_URL =
  "https://script.google.com/macros/s/AKfycbwuaVPIpN_oThzs8s06mcDHDk2CvWFVWhuSLZ7FqISAdsNDAjQNUr29JMR6UO1k8vlg0w/exec";

/* ======================================================
   ESTADO
====================================================== */

let listas = [];

let contador = 0;

const undoStack = [];

const redoStack = [];

/* ======================================================
   PIX
====================================================== */

btnPix.addEventListener(
  "click",
  copiarPix
);

function copiarPix() {

  navigator.clipboard.writeText(
    chavePix
  );

  alert(
    "CHAVE PIX COPIADA ✅\n\n" +
    chavePix
  );
}

/* ======================================================
   HISTÓRICO
====================================================== */

function salvarHistorico() {

  undoStack.push(
    JSON.stringify(listas)
  );

  if (undoStack.length > 100) {

    undoStack.shift();
  }

  redoStack.length = 0;
}

function desfazer() {

  if (undoStack.length <= 1) return;

  redoStack.push(
    JSON.stringify(listas)
  );

  undoStack.pop();

  listas = JSON.parse(
    undoStack[undoStack.length - 1]
  );

  renderizar();

  salvarGoogleSheets();
}

function refazer() {

  if (redoStack.length === 0) return;

  undoStack.push(
    JSON.stringify(listas)
  );

  listas = JSON.parse(
    redoStack.pop()
  );

  renderizar();

  salvarGoogleSheets();
}

/* ======================================================
   GOOGLE SHEETS
====================================================== */

async function carregarGoogleSheets() {

  try {

    const resposta =
      await fetch(API_URL);

    const dados =
      await resposta.json();

    listas = [];

    dados.forEach(item => {

      let listaExistente =
        listas.find(
          l => l.titulo === item.lista
        );

      if (!listaExistente) {

        listaExistente = {

          id: Date.now() + Math.random(),

          titulo: item.lista,

          jogadores: []

        };

        listas.push(listaExistente);
      }

      listaExistente.jogadores.push({

        nome: item.jogador,

        status: item.status

      });

    });

    if (listas.length === 0) {

      criarLista("TITULARES", false);

      criarLista("SUPLENTES", false);

      criarLista("GOLEIROS", false);

      criarLista("FORA", false);
    }

    salvarHistorico();

    renderizar();

  } catch (erro) {

    console.error(
      "Erro ao carregar:",
      erro
    );
  }
}

async function salvarGoogleSheets() {

  try {

    await fetch(API_URL, {

      method: "POST",

      body: JSON.stringify(listas)

    });

  } catch (erro) {

    console.error(
      "Erro ao salvar:",
      erro
    );
  }
}

/* ======================================================
   BOTÕES
====================================================== */

btnNovaLista.addEventListener(
  "click",
  () => {

    salvarHistorico();

    criarLista();
  }
);

btnDesfazer.addEventListener(
  "click",
  desfazer
);

btnRefazer.addEventListener(
  "click",
  refazer
);

/* ======================================================
   CRIAR LISTA
====================================================== */

function criarLista(
  nome = null,
  salvar = true
) {

  contador++;

  listas.push({

    id: Date.now() + Math.random(),

    titulo:
      nome || `LISTA ${contador}`,

    jogadores: [
      {
        nome: "",
        status: "?"
      }
    ]

  });

  if (salvar) {

    salvarHistorico();

    salvarGoogleSheets();
  }

  renderizar();
}

/* ======================================================
   RENDER
====================================================== */

function renderizar() {

  listasContainer.innerHTML = "";

  listas.forEach(
    (lista, listaIndex) => {

      const div =
        document.createElement("div");

      div.className = "lista";

      div.innerHTML = `

        <div class="listaHeader">

          <button
            class="btnExcluirLista"
            onclick="removerLista(${listaIndex})"
          >
            ×
          </button>

          <input
            class="listaTitulo"
            value="${lista.titulo}"
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

            ${lista.jogadores.map(
              (jogador, jogadorIndex) => `

              <tr>

                <td class="dragHandle">
                  ⋮⋮
                </td>

                <td class="colunaNumero">
                  ${jogadorIndex + 1}
                </td>

                <td>
                  <input
                    type="text"
                    value="${jogador.nome}"
                    placeholder="Nome"
                    onchange="alterarJogador(${listaIndex}, ${jogadorIndex}, 'nome', this.value)"
                  >
                </td>

                <td>
                  <input
                    type="text"
                    value="${jogador.status}"
                    placeholder="?"
                    onchange="alterarJogador(${listaIndex}, ${jogadorIndex}, 'status', this.value)"
                  >
                </td>

              </tr>

            `
            ).join("")}

          </tbody>

        </table>

        <div class="acoes">

          <button onclick="adicionarLinha(${listaIndex})">
            +
          </button>

          <button onclick="removerLinha(${listaIndex})">
            −
          </button>

        </div>

      `;

      listasContainer.appendChild(div);

      ativarDragDrop(listaIndex);

    }
  );
}

/* ======================================================
   ALTERAÇÕES
====================================================== */

function alterarTitulo(
  listaIndex,
  valor
) {

  salvarHistorico();

  listas[listaIndex].titulo =
    valor.toUpperCase();

  salvarGoogleSheets();
}

function alterarJogador(
  listaIndex,
  jogadorIndex,
  campo,
  valor
) {

  salvarHistorico();

  listas[listaIndex]
    .jogadores[jogadorIndex][campo] =
      valor.toUpperCase();

  salvarGoogleSheets();
}

/* ======================================================
   LINHAS
====================================================== */

function adicionarLinha(listaIndex) {

  salvarHistorico();

  listas[listaIndex].jogadores.push({

    nome: "",

    status: "?"

  });

  renderizar();

  salvarGoogleSheets();
}

function removerLinha(listaIndex) {

  if (
    listas[listaIndex]
    .jogadores.length <= 1
  ) return;

  salvarHistorico();

  listas[listaIndex]
    .jogadores.pop();

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
   DRAG DROP
====================================================== */

function ativarDragDrop(listaIndex) {

  const tbody =
    document.getElementById(
      `tbody-${listaIndex}`
    );

  new Sortable(tbody, {

    handle: ".dragHandle",

    group: "listasCompartilhadas",

    animation: 180,

    ghostClass: "sortable-ghost",

    chosenClass: "sortable-chosen",

    onStart: () => {

      salvarHistorico();
    },

    onEnd: (evt) => {

      const origem =
        evt.from.id.split("-")[1];

      const destino =
        evt.to.id.split("-")[1];

      const item =
        listas[origem]
        .jogadores
        .splice(evt.oldIndex, 1)[0];

      listas[destino]
        .jogadores
        .splice(evt.newIndex, 0, item);

      renderizar();

      salvarGoogleSheets();
    }

  });
}

/* ======================================================
   COMPARTILHAR
====================================================== */

btnCompartilhar.addEventListener(
  "click",
  compartilharWhatsApp
);

function compartilharWhatsApp() {

  let texto = "";

  texto +=
    "================================\n";

  texto +=
    "    𝙲𝚄𝙿ÃO 𝙽ÃO 𝙵𝙸𝚂𝙲𝙰𝙻\n";

  texto +=
    "================================\n\n";

  listas.forEach(lista => {

    texto +=
      `${lista.titulo}\n`;

    texto +=
      "--------------------------------\n";

    lista.jogadores.forEach(
      (jogador, index) => {

        const numero =
          String(index + 1)
          .padStart(2, '0');

        const nome =
          (jogador.nome || "")
          .toUpperCase()
          .padEnd(20, ".");

        const status =
          jogador.status || "?";

        texto +=
          `${numero} ${nome} ${status}\n`;

      }
    );

    texto += "\n";

  });

  texto +=
    "================================\n";

  texto +=
    "      𝙵𝚄𝚃𝙿ÃO 𝙾𝙽𝙻𝙸𝙽𝙴\n";

  texto +=
    "================================";

  const url =
    `https://wa.me/?text=${encodeURIComponent(texto)}`;

  window.open(url, "_blank");
}

/* ======================================================
   START
====================================================== */

carregarGoogleSheets();
