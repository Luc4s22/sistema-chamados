const API_URL = "http://127.0.0.1:5000/api/chamados";

let chamadoEditandoId = null;
let todosOsChamados = [];

const formChamado = document.getElementById("formChamado");


/* =====================================================
   CADASTRAR CHAMADO
===================================================== */

formChamado.addEventListener("submit", async function (event) {

    event.preventDefault();


    const numeroChamado = document
        .getElementById("numero_chamado")
        .value
        .trim();


    const usuario = document
        .getElementById("usuario")
        .value
        .trim();


    const chamado = {

        numero_chamado:
            numeroChamado === ""
                ? null
                : numeroChamado,

        usuario:
            usuario === ""
                ? null
                : usuario,

        funcionario:
            document
                .getElementById("funcionario")
                .value
                .trim(),

        servico:
            document
                .getElementById("servico")
                .value
                .trim(),

        solicitante:
            document
                .getElementById("solicitante")
                .value
                .trim(),

        setor:
            document
                .getElementById("setor")
                .value
                .trim(),

        unidade:
            document
                .getElementById("unidade")
                .value
                .trim(),

        andar:
            document
                .getElementById("andar")
                .value
                .trim(),

        predio:
            document
                .getElementById("predio")
                .value
                .trim(),

        observacao:
            document
                .getElementById("observacao")
                .value
                .trim()
    };


    try {

        const resposta = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(chamado)

        });


        const dados =
            await resposta.json();


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

            alert(
                "Chamado aberto com sucesso!"
            );
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

});


/* =====================================================
   CARREGAR CHAMADOS
===================================================== */

async function carregarChamados() {

    try {

        const resposta =
            await fetch(API_URL);


        if (!resposta.ok) {

            throw new Error(
                "Erro HTTP: " +
                resposta.status
            );
        }


        const chamados =
            await resposta.json();


        todosOsChamados =
            chamados;


        /* Atualiza os contadores */

        atualizarContadores();


        /* Atualiza a tabela */

        pesquisarChamados();


    } catch (erro) {

        console.error(
            "Erro ao carregar chamados:",
            erro
        );


        const tabela =
            document.getElementById(
                "listaChamados"
            );


        tabela.innerHTML = `
            <tr>
                <td colspan="14">
                    Não foi possível carregar os chamados.
                </td>
            </tr>
        `;
    }

}


/* =====================================================
   CONTADORES DE O.S.
===================================================== */

function atualizarContadores() {

    const totalOS =
        document.getElementById(
            "totalOS"
        );


    const totalAbertas =
        document.getElementById(
            "totalAbertas"
        );


    const totalPendentes =
        document.getElementById(
            "totalPendentes"
        );


    const totalConcluidas =
        document.getElementById(
            "totalConcluidas"
        );


    /* Total de O.S. */

    const total =
        todosOsChamados.length;


    /* O.S. abertas */

    const abertas =
        todosOsChamados.filter(
            function (chamado) {

                return (
                    chamado.status ===
                    "ABERTO"
                );

            }
        ).length;


    /* O.S. pendentes */

    const pendentes =
        todosOsChamados.filter(
            function (chamado) {

                return (
                    chamado.status ===
                    "PENDENTE"
                );

            }
        ).length;


    /* O.S. concluídas */

    const concluidas =
        todosOsChamados.filter(
            function (chamado) {

                return (
                    chamado.status ===
                    "CONCLUÍDO"
                );

            }
        ).length;


    /* Coloca os números na tela */

    if (totalOS) {

        totalOS.textContent =
            total;
    }


    if (totalAbertas) {

        totalAbertas.textContent =
            abertas;
    }


    if (totalPendentes) {

        totalPendentes.textContent =
            pendentes;
    }


    if (totalConcluidas) {

        totalConcluidas.textContent =
            concluidas;
    }

}


/* =====================================================
   RENDERIZAR CHAMADOS
===================================================== */

function renderizarChamados(chamados) {

    const tabela =
        document.getElementById(
            "listaChamados"
        );


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


    chamados.forEach(
        function (chamado) {

            let classeStatus = "";


            if (
                chamado.status ===
                "ABERTO"
            ) {

                classeStatus =
                    "status-aberto";

            } else if (
                chamado.status ===
                "PENDENTE"
            ) {

                classeStatus =
                    "status-pendente";

            } else {

                classeStatus =
                    "status-concluido";
            }


            let numeroExibicao =
                "—";


            if (
                chamado.numero_chamado !== null &&
                chamado.numero_chamado !== undefined &&
                chamado.numero_chamado !== ""
            ) {

                numeroExibicao =
                    "#" +
                    chamado.numero_chamado;
            }


            const botaoEditar = `

                <button
                    type="button"
                    class="btn-editar"
                    onclick="abrirModalEditar(${chamado.id})"
                >
                    Editar
                </button>

            `;


            const botaoExcluir = `

                <button
                    type="button"
                    class="btn-excluir"
                    onclick="excluirChamado(${chamado.id})"
                >
                    Excluir
                </button>

            `;


            let botaoConcluir = "";


            if (
                chamado.status !==
                "CONCLUÍDO"
            ) {

                botaoConcluir = `

                    <button
                        type="button"
                        class="btn-concluir"
                        onclick="concluirChamado(${chamado.id})"
                    >
                        Concluir
                    </button>

                `;
            }


            const linha = `

                <tr>

                    <td>
                        ${numeroExibicao}
                    </td>

                    <td>
                        ${chamado.usuario || ""}
                    </td>

                    <td>
                        ${chamado.funcionario || ""}
                    </td>

                    <td>
                        ${chamado.data_abertura || ""}
                    </td>

                    <td>
                        ${chamado.horario_abertura || ""}
                    </td>

                    <td>
                        ${chamado.servico || ""}
                    </td>

                    <td>
                        ${chamado.solicitante || ""}
                    </td>

                    <td>
                        ${chamado.setor || ""}
                    </td>

                    <td>
                        ${chamado.unidade || ""}
                    </td>

                    <td>
                        ${chamado.andar || ""}
                    </td>

                    <td>
                        ${chamado.predio || ""}
                    </td>

                    <td>
                        ${chamado.observacao || ""}
                    </td>


                    <td>

                        <span
                            class="status ${classeStatus}"
                        >
                            ${chamado.status}
                        </span>

                    </td>


                    <td>

                        <div class="acoes">

                            ${botaoEditar}

                            ${botaoConcluir}

                            ${botaoExcluir}

                        </div>

                    </td>

                </tr>

            `;


            tabela.innerHTML +=
                linha;

        }
    );

}


/* =====================================================
   PESQUISA
===================================================== */

function pesquisarChamados() {

    const campoPesquisa =
        document.getElementById(
            "pesquisaChamados"
        );


    if (!campoPesquisa) {

        renderizarChamados(
            todosOsChamados
        );

        return;
    }


    const pesquisa =
        campoPesquisa.value
            .toLowerCase()
            .trim();


    if (pesquisa === "") {

        renderizarChamados(
            todosOsChamados
        );

        return;
    }


    const chamadosFiltrados =
        todosOsChamados.filter(
            function (chamado) {

                const setor =
                    String(
                        chamado.setor || ""
                    ).toLowerCase();


                const numero =
                    String(
                        chamado.numero_chamado || ""
                    ).toLowerCase();


                return (
                    setor.includes(
                        pesquisa
                    ) ||

                    numero.includes(
                        pesquisa
                    )
                );

            }
        );


    renderizarChamados(
        chamadosFiltrados
    );

}


/* =====================================================
   PESQUISA EM TEMPO REAL
===================================================== */

const campoPesquisa =
    document.getElementById(
        "pesquisaChamados"
    );


if (campoPesquisa) {

    campoPesquisa.addEventListener(
        "input",
        pesquisarChamados
    );

}


/* =====================================================
   ABRIR MODAL DE EDIÇÃO
===================================================== */

function abrirModalEditar(id) {

    const chamado =
        todosOsChamados.find(
            function (item) {

                return item.id === id;

            }
        );


    if (!chamado) {

        alert(
            "Chamado não encontrado."
        );

        return;
    }


    chamadoEditandoId =
        id;


    document.getElementById(
        "editarNumero"
    ).value =

        chamado.numero_chamado !== null &&
        chamado.numero_chamado !== undefined

            ? chamado.numero_chamado

            : "";


    document.getElementById(
        "editarUsuario"
    ).value =
        chamado.usuario || "";


    document.getElementById(
        "editarFuncionario"
    ).value =
        chamado.funcionario || "";


    document.getElementById(
        "editarServico"
    ).value =
        chamado.servico || "";


    document.getElementById(
        "editarSolicitante"
    ).value =
        chamado.solicitante || "";


    document.getElementById(
        "editarSetor"
    ).value =
        chamado.setor || "";


    document.getElementById(
        "editarUnidade"
    ).value =
        chamado.unidade || "";


    document.getElementById(
        "editarAndar"
    ).value =
        chamado.andar || "";


    document.getElementById(
        "editarPredio"
    ).value =
        chamado.predio || "";


    document.getElementById(
        "editarObservacao"
    ).value =
        chamado.observacao || "";


    const modal =
        document.getElementById(
            "modalEditar"
        );


    modal.classList.add(
        "ativo"
    );


    document.getElementById(
        "editarNumero"
    ).focus();

}


/* =====================================================
   FECHAR MODAL
===================================================== */

function fecharModal() {

    chamadoEditandoId =
        null;


    const modal =
        document.getElementById(
            "modalEditar"
        );


    modal.classList.remove(
        "ativo"
    );


    document.getElementById(
        "editarNumero"
    ).value = "";


    document.getElementById(
        "editarUsuario"
    ).value = "";


    document.getElementById(
        "editarFuncionario"
    ).value = "";


    document.getElementById(
        "editarServico"
    ).value = "";


    document.getElementById(
        "editarSolicitante"
    ).value = "";


    document.getElementById(
        "editarSetor"
    ).value = "";


    document.getElementById(
        "editarUnidade"
    ).value = "";


    document.getElementById(
        "editarAndar"
    ).value = "";


    document.getElementById(
        "editarPredio"
    ).value = "";


    document.getElementById(
        "editarObservacao"
    ).value = "";

}


/* =====================================================
   SALVAR EDIÇÃO
===================================================== */

async function salvarEdicao() {

    if (!chamadoEditandoId) {

        alert(
            "Nenhum chamado foi selecionado."
        );

        return;
    }


    const numero =
        document.getElementById(
            "editarNumero"
        ).value.trim();


    const usuario =
        document.getElementById(
            "editarUsuario"
        ).value.trim();


    const funcionario =
        document.getElementById(
            "editarFuncionario"
        ).value.trim();


    const servico =
        document.getElementById(
            "editarServico"
        ).value.trim();


    const solicitante =
        document.getElementById(
            "editarSolicitante"
        ).value.trim();


    const setor =
        document.getElementById(
            "editarSetor"
        ).value.trim();


    const unidade =
        document.getElementById(
            "editarUnidade"
        ).value.trim();


    const andar =
        document.getElementById(
            "editarAndar"
        ).value.trim();


    const predio =
        document.getElementById(
            "editarPredio"
        ).value.trim();


    const observacao =
        document.getElementById(
            "editarObservacao"
        ).value.trim();


    if (!funcionario) {

        alert(
            "Informe o funcionário."
        );


        document.getElementById(
            "editarFuncionario"
        ).focus();


        return;
    }


    if (!servico) {

        alert(
            "Informe o serviço."
        );


        document.getElementById(
            "editarServico"
        ).focus();


        return;
    }


    if (!solicitante) {

        alert(
            "Informe o solicitante."
        );


        document.getElementById(
            "editarSolicitante"
        ).focus();


        return;
    }


    if (!setor) {

        alert(
            "Informe o setor."
        );


        document.getElementById(
            "editarSetor"
        ).focus();


        return;
    }


    if (!unidade) {

        alert(
            "Informe a unidade."
        );


        document.getElementById(
            "editarUnidade"
        ).focus();


        return;
    }


    if (!andar) {

        alert(
            "Informe o andar."
        );


        document.getElementById(
            "editarAndar"
        ).focus();


        return;
    }


    if (!predio) {

        alert(
            "Informe o prédio."
        );


        document.getElementById(
            "editarPredio"
        ).focus();


        return;
    }


    let numeroChamado =
        null;


    if (numero !== "") {

        if (!/^\d+$/.test(numero)) {

            alert(
                "O número do chamado deve conter apenas números."
            );


            document.getElementById(
                "editarNumero"
            ).focus();


            return;
        }


        if (Number(numero) <= 0) {

            alert(
                "O número do chamado deve ser maior que zero."
            );


            document.getElementById(
                "editarNumero"
            ).focus();


            return;
        }


        numeroChamado =
            numero;
    }


    const dadosEdicao = {

        numero_chamado:
            numeroChamado,

        usuario:
            usuario === ""
                ? null
                : usuario,

        funcionario:
            funcionario,

        servico:
            servico,

        solicitante:
            solicitante,

        setor:
            setor,

        unidade:
            unidade,

        andar:
            andar,

        predio:
            predio,

        observacao:
            observacao
    };


    try {

        const resposta =
            await fetch(
                `${API_URL}/${chamadoEditandoId}`,
                {

                    method: "PUT",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            dadosEdicao
                        )
                }
            );


        const dados =
            await resposta.json();


        if (!resposta.ok) {

            alert(
                dados.erro ||
                "Erro ao alterar chamado."
            );

            return;
        }


        alert(
            "Chamado alterado com sucesso!"
        );


        fecharModal();


        await carregarChamados();


    } catch (erro) {

        console.error(
            "Erro ao editar chamado:",
            erro
        );


        alert(
            "Erro ao conectar com o servidor."
        );
    }

}


/* =====================================================
   CONCLUIR CHAMADO
===================================================== */

async function concluirChamado(id) {

    const confirmar =
        confirm(
            "Deseja realmente concluir este chamado?"
        );


    if (!confirmar) {

        return;
    }


    try {

        const resposta =
            await fetch(
                `${API_URL}/${id}/concluir`,
                {

                    method: "PUT"

                }
            );


        const dados =
            await resposta.json();


        if (!resposta.ok) {

            alert(
                dados.erro ||
                "Erro ao concluir chamado."
            );

            return;
        }


        alert(
            "Chamado concluído com sucesso!"
        );


        await carregarChamados();


    } catch (erro) {

        console.error(
            "Erro ao concluir chamado:",
            erro
        );


        alert(
            "Erro ao conectar com o servidor."
        );
    }

}


/* =====================================================
   EXCLUIR CHAMADO
===================================================== */

async function excluirChamado(id) {

    const confirmar =
        confirm(
            "Deseja realmente excluir este chamado?\n\nEssa ação não poderá ser desfeita."
        );


    if (!confirmar) {

        return;
    }


    try {

        const resposta =
            await fetch(
                `${API_URL}/${id}`,
                {

                    method: "DELETE"

                }
            );


        const dados =
            await resposta.json();


        if (!resposta.ok) {

            alert(
                dados.erro ||
                "Erro ao excluir chamado."
            );

            return;
        }


        alert(
            "Chamado excluído com sucesso!"
        );


        await carregarChamados();


    } catch (erro) {

        console.error(
            "Erro ao excluir chamado:",
            erro
        );


        alert(
            "Erro ao conectar com o servidor."
        );
    }

}


/* =====================================================
   FECHAR MODAL CLICANDO FORA
===================================================== */

window.addEventListener(
    "click",
    function (event) {

        const modal =
            document.getElementById(
                "modalEditar"
            );


        if (
            event.target === modal
        ) {

            fecharModal();

        }

    }
);


/* =====================================================
   FECHAR MODAL COM ESC
===================================================== */

window.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape"
        ) {

            const modal =
                document.getElementById(
                    "modalEditar"
                );


            if (
                modal.classList.contains(
                    "ativo"
                )
            ) {

                fecharModal();

            }

        }

    }
);


/* =====================================================
   INICIAR SISTEMA
===================================================== */

carregarChamados();