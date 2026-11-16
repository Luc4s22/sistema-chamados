
const API_URL =
    "https://sistema-chamados-production-24e1.up.railway.app/api/chamados";

let chamadoEditandoId = null;
let todosOsChamados = [];

const formChamado = document.getElementById("formChamado");

// =============================================
// NOTIFICACOES DE NOVOS CHAMADOS
// =============================================

const INTERVALO_NOTIFICACOES = 10000;

let chamadosConhecidos = null;
let somAtivado = false;
let contextoAudio = null;
let consultaEmAndamento = false;
let temporizadorAviso = null;

function verificarNovosChamados(chamados) {
    if (!Array.isArray(chamados)) return;

    const idsAtuais = new Set(
        chamados
            .filter(c => c.id != null)
            .map(c => String(c.id))
    );

    // Primeira consulta: não notificar chamados antigos.
    if (chamadosConhecidos === null) {
        chamadosConhecidos = idsAtuais;
        return;
    }

    const novos = chamados.filter(c =>
        c.id != null &&
        !chamadosConhecidos.has(String(c.id))
    );

    // Preserva os IDs conhecidos para evitar
    // alertas duplicados em consultas futuras.
    chamadosConhecidos = idsAtuais;

    if (novos.length > 0) {
        mostrarAvisoNovosChamados(novos.length);
        tocarSomNotificacao();
    }
}

function mostrarAvisoNovosChamados(quantidade) {
    let aviso = document.getElementById("avisoNovoChamado");

    if (!aviso) {
        aviso = document.createElement("div");
        aviso.id = "avisoNovoChamado";

        aviso.setAttribute("role", "status");
        aviso.setAttribute("aria-live", "polite");

        Object.assign(aviso.style, {
            position: "fixed",
            right: "20px",
            bottom: "20px",
            background: "#214c37",
            color: "#ffffff",
            borderRadius: "10px",
            padding: "16px 22px",
            zIndex: "99999",
            boxShadow: "0 4px 16px #0004",
            fontWeight: "bold",
            maxWidth: "calc(100vw - 40px)"
        });

        document.body.appendChild(aviso);
    }

    aviso.textContent = quantidade === 1
        ? "🔔 Novo chamado recebido!"
        : `🔔 ${quantidade} novos chamados recebidos!`;

    aviso.hidden = false;

    clearTimeout(temporizadorAviso);

    temporizadorAviso = setTimeout(() => {
        aviso.hidden = true;
    }, 6000);
}

async function restaurarSomAutomaticamente() {
    const preferencia =
        localStorage.getItem("somChamadosAtivado");

    if (preferencia !== "true") return;

    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    try {
        if (!contextoAudio) {
            contextoAudio = new AudioContextClass();
        }

        await contextoAudio.resume();

        somAtivado = contextoAudio.state === "running";

        const botao = document.getElementById("alternarSom");

        if (botao) {
            botao.textContent = somAtivado
                ? "🔊 Som ativado"
                : "🔔 Ativar som";
        }
    } catch (erro) {
        console.warn("O navegador bloqueou o áudio automático.");
    }
}

document.addEventListener("click", () => {
    if (
        localStorage.getItem("somChamadosAtivado") === "true" &&
        !somAtivado
    ) {
        restaurarSomAutomaticamente();
    }
});

restaurarSomAutomaticamente();




function tocarSomNotificacao() {
    if (!somAtivado || !contextoAudio) return;

    if (contextoAudio.state !== "running") return;

    // Alarme com 3 toques fortes
    const frequencias = [850, 1050, 850];

    frequencias.forEach((frequencia, indice) => {
        const inicio =
            contextoAudio.currentTime + (indice * 0.35);

        const oscilador = contextoAudio.createOscillator();
        const volume = contextoAudio.createGain();

        oscilador.type = "square";
        oscilador.frequency.setValueAtTime(
            frequencia,
            inicio
        );

        // Volume alto, sem ultrapassar o limite digital
        volume.gain.setValueAtTime(0.0001, inicio);

        volume.gain.linearRampToValueAtTime(
            0.65,
            inicio + 0.03
        );

        volume.gain.setValueAtTime(
            0.65,
            inicio + 0.22
        );

        volume.gain.linearRampToValueAtTime(
            0.0001,
            inicio + 0.30
        );

        oscilador.connect(volume);
        volume.connect(contextoAudio.destination);

        oscilador.start(inicio);
        oscilador.stop(inicio + 0.31);
    });
}


function criarBotaoNotificacoes() {
    if (document.getElementById("alternarSom")) return;

    const botao = document.createElement("button");

    botao.type = "button";
    botao.id = "alternarSom";
    botao.textContent = "🔔 Ativar som";
    botao.setAttribute("aria-pressed", "false");
    botao.addEventListener("click", alternarSom);

    const botaoAtualizar = [
        ...document.querySelectorAll("button")
    ].find(b => b.textContent.trim() === "Atualizar");

    if (botaoAtualizar) {
        botao.className = botaoAtualizar.className;
        botaoAtualizar.parentNode.insertBefore(
            botao,
            botaoAtualizar
        );
    } else {
        Object.assign(botao.style, {
            position: "fixed",
            right: "20px",
            top: "20px",
            padding: "10px 16px",
            zIndex: "9999",
            cursor: "pointer"
        });

        document.body.appendChild(botao);
    }
}

// =============================================
// CADASTRAR CHAMADO
// =============================================

formChamado.addEventListener("submit", async function (event) {
    event.preventDefault();

    const numeroChamado = document
        .getElementById("numero_chamado").value.trim();

    const usuario = document
        .getElementById("usuario").value.trim();

    const chamado = {
        numero_chamado: numeroChamado === ""
            ? null : numeroChamado,

        usuario: usuario === ""
            ? null : usuario,

        funcionario: document
            .getElementById("funcionario").value.trim(),

        servico: document
            .getElementById("servico").value.trim(),

        solicitante: document
            .getElementById("solicitante").value.trim(),

        setor: document
            .getElementById("setor").value.trim(),

        unidade: document
            .getElementById("unidade").value.trim(),

        andar: document
            .getElementById("andar").value.trim(),

        predio: document
            .getElementById("predio").value.trim(),

        observacao: document
            .getElementById("observacao").value.trim()
    };

    try {
        const resposta = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(chamado)
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(dados.erro || "Erro ao cadastrar chamado.");
            return;
        }

        if (
            dados.numero_chamado !== null &&
            dados.numero_chamado !== undefined
        ) {
            alert(
                "Chamado #" +
                dados.numero_chamado +
                " aberto com sucesso!"
            );
        } else {
            alert("Chamado aberto com sucesso!");
        }

        formChamado.reset();

        await carregarChamados();

    } catch (erro) {
        console.error("Erro ao cadastrar chamado:", erro);
        alert("Erro ao conectar com o servidor Flask.");
    }
});

// =============================================
// CARREGAR CHAMADOS
// =============================================

async function carregarChamados() {
    if (consultaEmAndamento) return;

    consultaEmAndamento = true;

    try {
        const resposta = await fetch(API_URL, {
            cache: "no-store"
        });

        if (!resposta.ok) {
            throw new Error("Erro HTTP: " + resposta.status);
        }

        const chamados = await resposta.json();

        if (!Array.isArray(chamados)) {
            throw new Error("Formato de resposta inválido.");
        }

        verificarNovosChamados(chamados);

        todosOsChamados = chamados;

        atualizarContadores();
        pesquisarChamados();

    } catch (erro) {
        console.error("Erro ao carregar chamados:", erro);

        // Mantém a tabela existente quando uma consulta
        // temporária falhar, evitando perder a visualização.
        if (chamadosConhecidos === null) {
            const tabela = document.getElementById(
                "listaChamados"
            );

            if (tabela) {
                tabela.innerHTML = `
                    <tr>
                        <td colspan="14">
                            Não foi possível carregar os chamados.
                        </td>
                    </tr>
                `;
            }
        }
    } finally {
        consultaEmAndamento = false;
    }
}

// =============================================
// CONTADORES
// =============================================

function atualizarContadores() {
    const totalOS = document.getElementById("totalOS");
    const totalAbertas = document.getElementById("totalAbertas");
    const totalPendentes = document.getElementById("totalPendentes");
    const totalConcluidas = document.getElementById("totalConcluidas");

    const total = todosOsChamados.length;

    const abertas = todosOsChamados.filter(
        c => c.status === "ABERTO"
    ).length;

    const pendentes = todosOsChamados.filter(
        c => c.status === "PENDENTE"
    ).length;

    const concluidas = todosOsChamados.filter(
        c => c.status === "CONCLUÍDO"
    ).length;

    if (totalOS) totalOS.textContent = total;
    if (totalAbertas) totalAbertas.textContent = abertas;
    if (totalPendentes) totalPendentes.textContent = pendentes;
    if (totalConcluidas) totalConcluidas.textContent = concluidas;
}

// =============================================
// RENDERIZAR TABELA
// =============================================

function renderizarChamados(chamados) {
    const tabela = document.getElementById("listaChamados");

    if (!tabela) return;

    tabela.innerHTML = "";

    if (chamados.length === 0) {
        tabela.innerHTML = `
            <tr>
                <td colspan="14">
                    Nenhum chamado encontrado.
                </td>
            </tr>
        `;
        return;
    }

    // Evita inserir conteúdo digitado pelo usuário
    // diretamente como HTML.
    const escapar = valor => String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    chamados.forEach(chamado => {
        let classeStatus = "";

        if (chamado.status === "ABERTO") {
            classeStatus = "status-aberto";
        } else if (chamado.status === "PENDENTE") {
            classeStatus = "status-pendente";
        } else {
            classeStatus = "status-concluido";
        }

        const numeroExibicao =
            chamado.numero_chamado != null &&
            chamado.numero_chamado !== ""
                ? "#" + escapar(chamado.numero_chamado)
                : "—";

        const linha = document.createElement("tr");

        const campos = [
            null,
            "usuario",
            "funcionario",
            "data_abertura",
            "horario_abertura",
            "servico",
            "solicitante",
            "setor",
            "unidade",
            "andar",
            "predio",
            "observacao"
        ];

        campos.forEach((campo, indice) => {
            const td = document.createElement("td");

            if (indice === 0) {
                td.textContent =
                    chamado.numero_chamado != null &&
                    chamado.numero_chamado !== ""
                        ? "#" + chamado.numero_chamado
                        : "—";
            } else {
                td.textContent = chamado[campo] ?? "";
            }

            linha.appendChild(td);
        });

        const tdStatus = document.createElement("td");
        const spanStatus = document.createElement("span");

        spanStatus.className = "status " + classeStatus;
        spanStatus.textContent = chamado.status || "";

        tdStatus.appendChild(spanStatus);
        linha.appendChild(tdStatus);

        const tdAcoes = document.createElement("td");
        const divAcoes = document.createElement("div");

        divAcoes.className = "acoes";

        const btnEditar = document.createElement("button");
        btnEditar.type = "button";
        btnEditar.className = "btn-editar";
        btnEditar.textContent = "Editar";
        btnEditar.onclick = () => abrirModalEditar(chamado.id);
        divAcoes.appendChild(btnEditar);

        if (chamado.status !== "CONCLUÍDO") {
            const btnConcluir = document.createElement("button");
            btnConcluir.type = "button";
            btnConcluir.className = "btn-concluir";
            btnConcluir.textContent = "Concluir";
            btnConcluir.onclick = () => concluirChamado(chamado.id);
            divAcoes.appendChild(btnConcluir);
        }

        const btnExcluir = document.createElement("button");
        btnExcluir.type = "button";
        btnExcluir.className = "btn-excluir";
        btnExcluir.textContent = "Excluir";
        btnExcluir.onclick = () => excluirChamado(chamado.id);
        divAcoes.appendChild(btnExcluir);

        tdAcoes.appendChild(divAcoes);
        linha.appendChild(tdAcoes);

        tabela.appendChild(linha);
    });
}

// =============================================
// PESQUISAR CHAMADOS
// =============================================

function pesquisarChamados() {
    const campoPesquisa =
        document.getElementById("pesquisaChamados");

    if (!campoPesquisa) {
        renderizarChamados(todosOsChamados);
        return;
    }

    const pesquisa = campoPesquisa.value.toLowerCase().trim();

    if (!pesquisa) {
        renderizarChamados(todosOsChamados);
        return;
    }

    const filtrados = todosOsChamados.filter(chamado => {
        const setor = String(chamado.setor || "").toLowerCase();
        const numero = String(
            chamado.numero_chamado || ""
        ).toLowerCase();

        return (
            setor.includes(pesquisa) ||
            numero.includes(pesquisa)
        );
    });

    renderizarChamados(filtrados);
}

const campoPesquisa =
    document.getElementById("pesquisaChamados");

if (campoPesquisa) {
    campoPesquisa.addEventListener("input", pesquisarChamados);
}

// =============================================
// ABRIR MODAL DE EDIÇÃO
// =============================================

function abrirModalEditar(id) {
    const chamado = todosOsChamados.find(
        item => String(item.id) === String(id)
    );

    if (!chamado) {
        alert("Chamado não encontrado.");
        return;
    }

    chamadoEditandoId = id;

    const campos = {
        editarNumero: chamado.numero_chamado,
        editarUsuario: chamado.usuario,
        editarFuncionario: chamado.funcionario,
        editarServico: chamado.servico,
        editarSolicitante: chamado.solicitante,
        editarSetor: chamado.setor,
        editarUnidade: chamado.unidade,
        editarAndar: chamado.andar,
        editarPredio: chamado.predio,
        editarObservacao: chamado.observacao
    };

    Object.entries(campos).forEach(([campo, valor]) => {
        document.getElementById(campo).value = valor ?? "";
    });

    document.getElementById("modalEditar")
        .classList.add("ativo");

    document.getElementById("editarNumero").focus();
}

// =============================================
// FECHAR MODAL
// =============================================

function fecharModal() {
    chamadoEditandoId = null;

    document.getElementById("modalEditar")
        .classList.remove("ativo");

    [
        "editarNumero",
        "editarUsuario",
        "editarFuncionario",
        "editarServico",
        "editarSolicitante",
        "editarSetor",
        "editarUnidade",
        "editarAndar",
        "editarPredio",
        "editarObservacao"
    ].forEach(id => {
        document.getElementById(id).value = "";
    });
}

// =============================================
// SALVAR EDIÇÃO
// =============================================

async function salvarEdicao() {
    if (!chamadoEditandoId) {
        alert("Nenhum chamado foi selecionado.");
        return;
    }

    const obter = id =>
        document.getElementById(id).value.trim();

    const numero = obter("editarNumero");

    const camposObrigatorios = {
        editarFuncionario: "funcionário",
        editarServico: "serviço",
        editarSolicitante: "solicitante",
        editarSetor: "setor",
        editarUnidade: "unidade",
        editarAndar: "andar",
        editarPredio: "prédio"
    };

    for (const [id, nome] of Object.entries(camposObrigatorios)) {
        if (!obter(id)) {
            alert("Informe o " + nome + ".");
            document.getElementById(id).focus();
            return;
        }
    }

    if (
        numero !== "" &&
        (!/^\d+$/.test(numero) || Number(numero) <= 0)
    ) {
        alert("O número do chamado deve ser maior que zero e conter apenas números.");
        document.getElementById("editarNumero").focus();
        return;
    }

    const dadosEdicao = {
        numero_chamado: numero === "" ? null : numero,
        usuario: obter("editarUsuario") || null,
        funcionario: obter("editarFuncionario"),
        servico: obter("editarServico"),
        solicitante: obter("editarSolicitante"),
        setor: obter("editarSetor"),
        unidade: obter("editarUnidade"),
        andar: obter("editarAndar"),
        predio: obter("editarPredio"),
        observacao: obter("editarObservacao")
    };

    try {
        const resposta = await fetch(
            `${API_URL}/${chamadoEditandoId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(dadosEdicao)
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(dados.erro || "Erro ao alterar chamado.");
            return;
        }

        alert("Chamado alterado com sucesso!");
        fecharModal();
        await carregarChamados();

    } catch (erro) {
        console.error("Erro ao editar chamado:", erro);
        alert("Erro ao conectar com o servidor.");
    }
}

// =============================================
// CONCLUIR CHAMADO
// =============================================

async function concluirChamado(id) {
    if (!confirm("Deseja realmente concluir este chamado?")) {
        return;
    }

    try {
        const resposta = await fetch(
            `${API_URL}/${id}/concluir`,
            { method: "PUT" }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(dados.erro || "Erro ao concluir chamado.");
            return;
        }

        alert("Chamado concluído com sucesso!");
        await carregarChamados();

    } catch (erro) {
        console.error("Erro ao concluir chamado:", erro);
        alert("Erro ao conectar com o servidor.");
    }
}

// =============================================
// EXCLUIR CHAMADO
// =============================================

async function excluirChamado(id) {
    const confirmar = confirm(
        "Deseja realmente excluir este chamado?\n\n" +
        "Essa ação não poderá ser desfeita."
    );

    if (!confirmar) return;

    try {
        const resposta = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(dados.erro || "Erro ao excluir chamado.");
            return;
        }

        alert("Chamado excluído com sucesso!");
        await carregarChamados();

    } catch (erro) {
        console.error("Erro ao excluir chamado:", erro);
        alert("Erro ao conectar com o servidor.");
    }
}

// =============================================
// FECHAR MODAL CLICANDO FORA
// =============================================

window.addEventListener("click", function (event) {
    const modal = document.getElementById("modalEditar");

    if (modal && event.target === modal) {
        fecharModal();
    }
});

// =============================================
// FECHAR MODAL COM ESC
// =============================================

window.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        const modal = document.getElementById("modalEditar");

        if (modal && modal.classList.contains("ativo")) {
            fecharModal();
        }
    }
});

// =============================================
// INICIAR SISTEMA
// =============================================

criarBotaoNotificacoes();
carregarChamados();

// Consultar novos chamados a cada 10 segundos.
// Funciona nos computadores que mantêm
// a página do sistema aberta.

setInterval(() => {
    carregarChamados();
}, INTERVALO_NOTIFICACOES);
