
/* ============================================
   SISTEMA DE CHAMADOS
   BACKEND RAILWAY + FRONTEND NETLIFY
============================================ */

const API_URL =
    "https://sistema-chamados-production-24e1.up.railway.app/api/chamados";

let chamadoEditandoId = null;
let todosOsChamados = [];

const formChamado = document.getElementById("formChamado");

/* ============================================
   SISTEMA DE NOTIFICACOES
============================================ */

const INTERVALO_NOTIFICACOES = 10000;
const CHAVE_SOM = "somChamadosAtivado";

let chamadosConhecidos = null;
let contextoAudio = null;
let somAtivado = false;
let consultaEmAndamento = false;
let temporizadorAviso = null;

// Som habilitado por padrão como preferência.
// O navegador ainda pode exigir uma interação
// para autorizar a reprodução.
if (localStorage.getItem(CHAVE_SOM) === null) {
    localStorage.setItem(CHAVE_SOM, "true");
}

function somDesejado() {
    return localStorage.getItem(CHAVE_SOM) === "true";
}

/* ============================================
   CRIAR CONTEXTO DE AUDIO
============================================ */

function obterContextoAudio() {
    const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

    if (!AudioContextClass) {
        return null;
    }

    if (
        !contextoAudio ||
        contextoAudio.state === "closed"
    ) {
        contextoAudio = new AudioContextClass();
    }

    return contextoAudio;
}

/* ============================================
   ATUALIZAR INDICADOR DO SOM
============================================ */

function atualizarBotaoSom() {
    const botao = document.getElementById("alternarSom");

    if (!botao) return;

    if (!somDesejado()) {
        botao.textContent = "🔕 Som desligado";
    } else if (
        somAtivado &&
        contextoAudio &&
        contextoAudio.state === "running"
    ) {
        botao.textContent = "🔊 Som ativado";
    } else {
        botao.textContent = "🔔 Liberar som";
    }

    botao.setAttribute(
        "aria-pressed",
        String(somDesejado())
    );
}

/* ============================================
   ATIVAR AUDIO
============================================ */

async function ativarAudio() {
    const audio = obterContextoAudio();

    if (!audio) {
        somAtivado = false;
        atualizarBotaoSom();
        return false;
    }

    try {
        if (audio.state !== "running") {
            await audio.resume();
        }

        somAtivado = audio.state === "running";

        atualizarBotaoSom();

        return somAtivado;

    } catch (erro) {
        console.error("Erro ao ativar áudio:", erro);
        somAtivado = false;
        atualizarBotaoSom();
        return false;
    }
}

/* ============================================
   LIGAR OU DESLIGAR SOM
============================================ */

async function alternarSom() {
    if (somDesejado() && somAtivado) {
        localStorage.setItem(CHAVE_SOM, "false");
        somAtivado = false;
        atualizarBotaoSom();
        return;
    }

    localStorage.setItem(CHAVE_SOM, "true");

    const ativado = await ativarAudio();

    if (ativado) {
        tocarSomNotificacao();
    } else {
        alert(
            "O navegador bloqueou o áudio. " +
            "Clique em Testar som para liberar."
        );
    }
}

/* ============================================
   ALARME SONORO ALTO
============================================ */

function tocarSomNotificacao() {
    if (!somDesejado()) return false;

    if (
        !somAtivado ||
        !contextoAudio ||
        contextoAudio.state !== "running"
    ) {
        atualizarBotaoSom();
        console.warn("Áudio ainda não liberado.");
        return false;
    }

    try {
        const audio = contextoAudio;

        // Quatro toques de alarme.
        const frequencias = [850, 1050, 850, 1050];

        frequencias.forEach((frequencia, indice) => {
            const inicio =
                audio.currentTime + indice * 0.35;

            const oscilador = audio.createOscillator();
            const volume = audio.createGain();

            oscilador.type = "square";

            oscilador.frequency.setValueAtTime(
                frequencia,
                inicio
            );

            volume.gain.setValueAtTime(
                0.0001,
                inicio
            );

            volume.gain.linearRampToValueAtTime(
                0.45,
                inicio + 0.025
            );

            volume.gain.setValueAtTime(
                0.45,
                inicio + 0.23
            );

            volume.gain.linearRampToValueAtTime(
                0.0001,
                inicio + 0.30
            );

            oscilador.connect(volume);
            volume.connect(audio.destination);

            oscilador.start(inicio);
            oscilador.stop(inicio + 0.31);
        });

        return true;

    } catch (erro) {
        console.error("Erro ao tocar alarme:", erro);
        return false;
    }
}

/* ============================================
   TESTAR SOM
============================================ */

async function testarSomNotificacao() {
    localStorage.setItem(CHAVE_SOM, "true");

    const ativado = await ativarAudio();

    if (!ativado) {
        alert(
            "Não foi possível ativar o som. " +
            "Verifique as permissões do navegador."
        );
        return;
    }

    const tocou = tocarSomNotificacao();

    if (!tocou) {
        alert("Não foi possível reproduzir o alarme.");
    }
}

/* ============================================
   AVISO VISUAL DE NOVO CHAMADO
============================================ */

function mostrarAvisoNovosChamados(quantidade) {
    let aviso = document.getElementById(
        "avisoNovoChamado"
    );

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
            padding: "18px 24px",
            borderRadius: "10px",
            fontSize: "17px",
            fontWeight: "bold",
            zIndex: "99999",
            maxWidth: "calc(100vw - 40px)",
            boxShadow: "0 5px 20px rgba(0,0,0,0.3)"
        });

        document.body.appendChild(aviso);
    }

    aviso.textContent = quantidade === 1
        ? "🔔 NOVO CHAMADO RECEBIDO!"
        : `🔔 ${quantidade} NOVOS CHAMADOS RECEBIDOS!`;

    aviso.hidden = false;

    clearTimeout(temporizadorAviso);

    temporizadorAviso = setTimeout(() => {
        aviso.hidden = true;
    }, 7000);
}

/* ============================================
   VERIFICAR NOVOS CHAMADOS
============================================ */

function verificarNovosChamados(chamados) {
    if (!Array.isArray(chamados)) return;

    const idsAtuais = new Set(
        chamados
            .filter(chamado => chamado.id != null)
            .map(chamado => String(chamado.id))
    );

    // Primeira consulta: registra os existentes,
    // sem gerar alarmes para chamados antigos.
    if (chamadosConhecidos === null) {
        chamadosConhecidos = idsAtuais;
        return;
    }

    const novos = chamados.filter(chamado =>
        chamado.id != null &&
        !chamadosConhecidos.has(String(chamado.id))
    );

    chamadosConhecidos = idsAtuais;

    if (novos.length > 0) {
        mostrarAvisoNovosChamados(novos.length);
        tocarSomNotificacao();
    }
}

/* ============================================
   CRIAR BOTOES DE AUDIO
============================================ */

function criarBotaoNotificacoes() {
    let botaoSom = document.getElementById(
        "alternarSom"
    );

    if (!botaoSom) {
        botaoSom = document.createElement("button");
        botaoSom.id = "alternarSom";
        botaoSom.type = "button";
    }

    botaoSom.onclick = alternarSom;

    let botaoTeste = document.getElementById(
        "testarSom"
    );

    if (!botaoTeste) {
        botaoTeste = document.createElement("button");
        botaoTeste.id = "testarSom";
        botaoTeste.type = "button";
    }

    botaoTeste.textContent = "🔊 Testar som";
    botaoTeste.onclick = testarSomNotificacao;

    const botaoAtualizar = [
        ...document.querySelectorAll("button")
    ].find(botao =>
        botao.textContent.trim() === "Atualizar"
    );

    if (botaoAtualizar) {
        botaoSom.className = botaoAtualizar.className;
        botaoTeste.className = botaoAtualizar.className;

        botaoAtualizar.before(
            botaoSom,
            botaoTeste
        );
    } else {
        let container = document.getElementById(
            "controlesNotificacao"
        );

        if (!container) {
            container = document.createElement("div");
            container.id = "controlesNotificacao";

            Object.assign(container.style, {
                position: "fixed",
                top: "15px",
                right: "15px",
                display: "flex",
                gap: "8px",
                zIndex: "99999"
            });

            document.body.appendChild(container);
        }

        [botaoSom, botaoTeste].forEach(botao => {
            Object.assign(botao.style, {
                padding: "10px 14px",
                background: "#214c37",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer"
            });

            container.appendChild(botao);
        });
    }

    atualizarBotaoSom();
}

/* ============================================
   RESTAURAR AUDIO AUTOMATICAMENTE
============================================ */

async function restaurarSomAutomaticamente() {
    if (!somDesejado()) {
        atualizarBotaoSom();
        return;
    }

    await ativarAudio();
}

// Tenta liberar áudio quando o usuário
// interagir com a página.

function desbloquearAudioNaInteracao() {
    if (!somDesejado()) return;

    if (
        !contextoAudio ||
        contextoAudio.state !== "running"
    ) {
        ativarAudio();
    }
}

document.addEventListener(
    "pointerdown",
    desbloquearAudioNaInteracao,
    { capture: true }
);

document.addEventListener(
    "keydown",
    desbloquearAudioNaInteracao,
    { capture: true }
);

// Restaurar áudio após retornar à página.

document.addEventListener(
    "visibilitychange",
    function () {
        if (!document.hidden && somDesejado()) {
            restaurarSomAutomaticamente();
        }
    }
);

/* ============================================
   CADASTRAR CHAMADO
============================================ */

if (formChamado) {
    formChamado.addEventListener(
        "submit",
        async function (event) {
            event.preventDefault();

            const obter = id =>
                document.getElementById(id).value.trim();

            const numeroChamado = obter("numero_chamado");
            const usuario = obter("usuario");

            const chamado = {
                numero_chamado:
                    numeroChamado === "" ? null : numeroChamado,

                usuario:
                    usuario === "" ? null : usuario,

                funcionario: obter("funcionario"),
                servico: obter("servico"),
                solicitante: obter("solicitante"),
                setor: obter("setor"),
                unidade: obter("unidade"),
                andar: obter("andar"),
                predio: obter("predio"),
                observacao: obter("observacao")
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
                    alert(
                        dados.erro ||
                        "Erro ao cadastrar chamado."
                    );
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
                console.error(
                    "Erro ao cadastrar chamado:",
                    erro
                );

                alert(
                    "Erro ao conectar com o servidor Flask."
                );
            }
        }
    );
}

/* ============================================
   CARREGAR CHAMADOS
============================================ */

async function carregarChamados() {
    if (consultaEmAndamento) return;

    consultaEmAndamento = true;

    try {
        const resposta = await fetch(API_URL, {
            cache: "no-store"
        });

        if (!resposta.ok) {
            throw new Error(
                "Erro HTTP: " + resposta.status
            );
        }

        const chamados = await resposta.json();

        if (!Array.isArray(chamados)) {
            throw new Error(
                "Formato de resposta inválido."
            );
        }

        verificarNovosChamados(chamados);

        todosOsChamados = chamados;

        atualizarContadores();
        pesquisarChamados();

    } catch (erro) {
        console.error(
            "Erro ao carregar chamados:",
            erro
        );

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

/* ============================================
   CONTADORES DE ORDENS DE SERVICO
============================================ */

function atualizarContadores() {
    const totalOS = document.getElementById("totalOS");
    const totalAbertas = document.getElementById("totalAbertas");
    const totalPendentes = document.getElementById("totalPendentes");
    const totalConcluidas = document.getElementById("totalConcluidas");

    const total = todosOsChamados.length;

    const abertas = todosOsChamados.filter(
        chamado => chamado.status === "ABERTO"
    ).length;

    const pendentes = todosOsChamados.filter(
        chamado => chamado.status === "PENDENTE"
    ).length;

    const concluidas = todosOsChamados.filter(
        chamado => chamado.status === "CONCLUÍDO"
    ).length;

    if (totalOS) totalOS.textContent = total;
    if (totalAbertas) totalAbertas.textContent = abertas;
    if (totalPendentes) totalPendentes.textContent = pendentes;
    if (totalConcluidas) totalConcluidas.textContent = concluidas;
}

/* ============================================
   RENDERIZAR TABELA
============================================ */

function renderizarChamados(chamados) {
    const tabela = document.getElementById(
        "listaChamados"
    );

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

    chamados.forEach(chamado => {
        let classeStatus = "";

        if (chamado.status === "ABERTO") {
            classeStatus = "status-aberto";
        } else if (chamado.status === "PENDENTE") {
            classeStatus = "status-pendente";
        } else {
            classeStatus = "status-concluido";
        }

        const linha = document.createElement("tr");

        const adicionarCelula = valor => {
            const td = document.createElement("td");
            td.textContent = valor ?? "";
            linha.appendChild(td);
            return td;
        };

        const numeroExibicao =
            chamado.numero_chamado != null &&
            chamado.numero_chamado !== ""
                ? "#" + chamado.numero_chamado
                : "—";

        adicionarCelula(numeroExibicao);
        adicionarCelula(chamado.usuario);
        adicionarCelula(chamado.funcionario);
        adicionarCelula(chamado.data_abertura);
        adicionarCelula(chamado.horario_abertura);
        adicionarCelula(chamado.servico);
        adicionarCelula(chamado.solicitante);
        adicionarCelula(chamado.setor);
        adicionarCelula(chamado.unidade);
        adicionarCelula(chamado.andar);
        adicionarCelula(chamado.predio);
        adicionarCelula(chamado.observacao);

        const tdStatus = adicionarCelula("");

        const spanStatus = document.createElement("span");
        spanStatus.className = "status " + classeStatus;
        spanStatus.textContent = chamado.status ?? "";

        tdStatus.appendChild(spanStatus);

        const tdAcoes = adicionarCelula("");
        const divAcoes = document.createElement("div");

        divAcoes.className = "acoes";

        const btnEditar = document.createElement("button");
        btnEditar.type = "button";
        btnEditar.className = "btn-editar";
        btnEditar.textContent = "Editar";

        btnEditar.onclick = () =>
            abrirModalEditar(chamado.id);

        divAcoes.appendChild(btnEditar);

        if (chamado.status !== "CONCLUÍDO") {
            const btnConcluir = document.createElement("button");

            btnConcluir.type = "button";
            btnConcluir.className = "btn-concluir";
            btnConcluir.textContent = "Concluir";

            btnConcluir.onclick = () =>
                concluirChamado(chamado.id);

            divAcoes.appendChild(btnConcluir);
        }

        const btnExcluir = document.createElement("button");

        btnExcluir.type = "button";
        btnExcluir.className = "btn-excluir";
        btnExcluir.textContent = "Excluir";

        btnExcluir.onclick = () =>
            excluirChamado(chamado.id);

        divAcoes.appendChild(btnExcluir);

        tdAcoes.appendChild(divAcoes);
        tabela.appendChild(linha);
    });
}

/* ============================================
   PESQUISAR CHAMADOS
============================================ */

function pesquisarChamados() {
    const campoPesquisa = document.getElementById(
        "pesquisaChamados"
    );

    if (!campoPesquisa) {
        renderizarChamados(todosOsChamados);
        return;
    }

    const pesquisa = campoPesquisa.value
        .toLowerCase()
        .trim();

    if (pesquisa === "") {
        renderizarChamados(todosOsChamados);
        return;
    }

    const filtrados = todosOsChamados.filter(
        chamado => {
            const setor = String(
                chamado.setor || ""
            ).toLowerCase();

            const numero = String(
                chamado.numero_chamado || ""
            ).toLowerCase();

            return (
                setor.includes(pesquisa) ||
                numero.includes(pesquisa)
            );
        }
    );

    renderizarChamados(filtrados);
}

const campoPesquisa = document.getElementById(
    "pesquisaChamados"
);

if (campoPesquisa) {
    campoPesquisa.addEventListener(
        "input",
        pesquisarChamados
    );
}

/* ============================================
   ABRIR MODAL DE EDICAO
============================================ */

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

    Object.entries(campos).forEach(
        ([campo, valor]) => {
            document.getElementById(campo).value =
                valor ?? "";
        }
    );

    document.getElementById("modalEditar")
        .classList.add("ativo");

    document.getElementById("editarNumero").focus();
}

/* ============================================
   FECHAR MODAL
============================================ */

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

/* ============================================
   SALVAR EDICAO
============================================ */

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

    for (
        const [id, nome] of Object.entries(
            camposObrigatorios
        )
    ) {
        if (!obter(id)) {
            alert("Informe o " + nome + ".");
            document.getElementById(id).focus();
            return;
        }
    }

    if (
        numero !== "" &&
        (
            !/^\d+$/.test(numero) ||
            Number(numero) <= 0
        )
    ) {
        alert(
            "O número do chamado deve conter apenas " +
            "números maiores que zero."
        );

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
            alert(
                dados.erro ||
                "Erro ao alterar chamado."
            );
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

/* ============================================
   CONCLUIR CHAMADO
============================================ */

async function concluirChamado(id) {
    const confirmar = confirm(
        "Deseja realmente concluir este chamado?"
    );

    if (!confirmar) return;

    try {
        const resposta = await fetch(
            `${API_URL}/${id}/concluir`,
            {
                method: "PUT"
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(
                dados.erro ||
                "Erro ao concluir chamado."
            );
            return;
        }

        alert("Chamado concluído com sucesso!");

        await carregarChamados();

    } catch (erro) {
        console.error(
            "Erro ao concluir chamado:",
            erro
        );

        alert("Erro ao conectar com o servidor.");
    }
}

/* ============================================
   EXCLUIR CHAMADO
============================================ */

async function excluirChamado(id) {
    const confirmar = confirm(
        "Deseja realmente excluir este chamado?\n\n" +
        "Essa ação não poderá ser desfeita."
    );

    if (!confirmar) return;

    try {
        const resposta = await fetch(
            `${API_URL}/${id}`,
            {
                method: "DELETE"
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(
                dados.erro ||
                "Erro ao excluir chamado."
            );
            return;
        }

        alert("Chamado excluído com sucesso!");

        await carregarChamados();

    } catch (erro) {
        console.error(
            "Erro ao excluir chamado:",
            erro
        );

        alert("Erro ao conectar com o servidor.");
    }
}

/* ============================================
   FECHAR MODAL CLICANDO FORA
============================================ */

window.addEventListener(
    "click",
    function (event) {
        const modal = document.getElementById(
            "modalEditar"
        );

        if (modal && event.target === modal) {
            fecharModal();
        }
    }
);

/* ============================================
   FECHAR MODAL COM ESC
============================================ */

window.addEventListener(
    "keydown",
    function (event) {
        if (event.key !== "Escape") return;

        const modal = document.getElementById(
            "modalEditar"
        );

        if (
            modal &&
            modal.classList.contains("ativo")
        ) {
            fecharModal();
        }
    }
);

/* ============================================
   INICIAR SISTEMA
============================================ */

// Criar botões do alarme.
criarBotaoNotificacoes();

// Tentar restaurar áudio.
restaurarSomAutomaticamente();

// Carregar chamados existentes.
carregarChamados();

// Verificar novos chamados a cada 10 segundos.
setInterval(() => {
    carregarChamados();
}, INTERVALO_NOTIFICACOES);
