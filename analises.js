/* =========================================================
   ANÁLISES
   Versão corrigida e completa
========================================================= */

(function () {

  "use strict";


  /* =======================================================
     OBTER CONTAINER DA ANÁLISE
  ======================================================= */

  function getAnalysisContainer() {

    const screen =
      document.getElementById("analysisScreen");

    if (!screen) {
      console.error(
        "ANÁLISES: analysisScreen não encontrado."
      );

      return null;
    }


    let container =
      document.getElementById("analysisContent");


    if (!container) {

      const main =
        screen.querySelector("main");

      if (!main) {
        console.error(
          "ANÁLISES: <main> não encontrado."
        );

        return null;
      }


      /*
        Remove somente o conteúdo inicial
        da área de análise.
      */

      const initialEmptyState =
        main.querySelector(".empty-state");

      if (initialEmptyState) {
        initialEmptyState.remove();
      }


      container =
        document.createElement("div");

      container.id =
        "analysisContent";

      main.appendChild(
        container
      );

    }


    return container;

  }


  /* =======================================================
     ESCAPE HTML
  ======================================================= */

  function escapeAnalysisHTML(value) {

    if (
      typeof window.escapeHTML ===
      "function"
    ) {

      return window.escapeHTML(
        value == null
          ? ""
          : String(value)
      );

    }


    return String(
      value == null
        ? ""
        : value
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );

  }


  /* =======================================================
     OBTER BANCO DE DADOS
  ======================================================= */

  function getRecordsForAnalysis() {

    /*
      O app principal pode disponibilizar
      database de formas diferentes.
    */

    if (
      typeof window.database !==
      "undefined" &&
      window.database &&
      Array.isArray(
        window.database.records
      )
    ) {

      return window.database.records;

    }


    if (
      typeof database !==
      "undefined" &&
      database &&
      Array.isArray(
        database.records
      )
    ) {

      return database.records;

    }


    console.warn(
      "ANÁLISES: database.records ainda não disponível."
    );


    return [];

  }


  /* =======================================================
     CONVERTER NÚMERO
  ======================================================= */

  function numberValue(value) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {

      return null;

    }


    const number =
      Number(
        String(value)
          .replace(",", ".")
      );


    if (
      !Number.isFinite(number)
    ) {

      return null;

    }


    return number;

  }


  /* =======================================================
     FORMATAR NÚMERO
  ======================================================= */

  function formatNumber(
    value,
    decimals = 0
  ) {

    const number =
      Number(value);


    if (
      !Number.isFinite(number)
    ) {

      return "0";

    }


    return number.toLocaleString(
      "pt-BR",
      {
        minimumFractionDigits:
          decimals,

        maximumFractionDigits:
          decimals
      }
    );

  }


  /* =======================================================
     CÁLCULOS
  ======================================================= */

  function calculateAnalysis() {

    const records =
      getRecordsForAnalysis();


    const validRecords =
      records.filter(
        record =>
          record &&
          typeof record ===
          "object"
      );


    const meals =
      validRecords.filter(
        record =>
          record.type === "meal"
      );


    const glucose =
      validRecords.filter(
        record =>
          record.type === "glucose"
      );


    const insulin =
      validRecords.filter(
        record =>
          record.type === "insulin"
      );


    const activity =
      validRecords.filter(
        record =>
          record.type === "activity"
      );


    const medication =
      validRecords.filter(
        record =>
          record.type === "medication"
      );


    const consultations =
      validRecords.filter(
        record =>
          record.type === "consultation"
      );


    /* =====================================================
       GLICEMIAS
    ===================================================== */

    const glucoseValues = [];


    glucose.forEach(
      record => {

        const possibleValues = [

          record.value,

          record.glucose,

          record.glucoseValue,

          record.bloodGlucose,

          record.mgdl,

          record.mgDl,

          record.glycemia,

          record.glicemia,

          record.glicemiaValue

        ];


        for (
          const value of
          possibleValues
        ) {

          const number =
            numberValue(value);


          if (
            number !== null &&
            number > 0
          ) {

            glucoseValues.push(
              number
            );

            break;

          }

        }

      }
    );


    let glucoseAverage = 0;


    if (
      glucoseValues.length > 0
    ) {

      glucoseAverage =
        glucoseValues.reduce(
          (
            total,
            value
          ) =>
            total + value,
          0
        ) /
        glucoseValues.length;

    }


    let glucoseMinimum = 0;
    let glucoseMaximum = 0;


    if (
      glucoseValues.length > 0
    ) {

      glucoseMinimum =
        Math.min(
          ...glucoseValues
        );


      glucoseMaximum =
        Math.max(
          ...glucoseValues
        );

    }


    /* =====================================================
       ATIVIDADES
    ===================================================== */

    let activityMinutes = 0;


    activity.forEach(
      record => {

        const possibleValues = [

          record.duration,

          record.minutes,

          record.durationMinutes,

          record.tempo,

          record.tempoMinutos

        ];


        for (
          const value of
          possibleValues
        ) {

          const number =
            numberValue(value);


          if (
            number !== null &&
            number >= 0
          ) {

            activityMinutes +=
              number;

            break;

          }

        }

      }
    );


    return {

      total:
        validRecords.length,

      meals:
        meals.length,

      glucose:
        glucose.length,

      insulin:
        insulin.length,

      activity:
        activity.length,

      activityMinutes,

      medication:
        medication.length,

      consultations:
        consultations.length,

      glucoseValues,

      glucoseAverage,

      glucoseMinimum,

      glucoseMaximum

    };

  }


  /* =======================================================
     RENDERIZAR ANÁLISE
  ======================================================= */

  function renderAnalysis() {

    console.log(
      "ANÁLISES: renderAnalysis() executado."
    );


    const container =
      getAnalysisContainer();


    if (!container) {
      return;
    }


    const data =
      calculateAnalysis();


    console.log(
      "ANÁLISES: dados encontrados:",
      data
    );


    /*
      IMPORTANTE:

      Mesmo que ainda não existam registros,
      mostramos a tela de análise funcionando.

      Isso evita que ela fique presa na mensagem
      "Carregando análises...".
    */


    let glucoseSection = "";


    if (
      data.glucoseValues.length > 0
    ) {

      glucoseSection = `

        <section class="card">

          <h3>
            🩸 Glicemia
          </h3>

          <div
            style="
              display:grid;
              grid-template-columns:
                repeat(2,minmax(0,1fr));
              gap:12px;
              margin-top:12px;
            "
          >

            <div
              style="
                padding:14px;
                border-radius:14px;
                background:#f8eeee;
              "
            >

              <small>
                Média
              </small>

              <strong
                style="
                  display:block;
                  font-size:24px;
                  margin-top:4px;
                  color:#7f4444;
                "
              >
                ${formatNumber(
                  data.glucoseAverage,
                  1
                )}
              </strong>

              <small>
                mg/dL
              </small>

            </div>


            <div
              style="
                padding:14px;
                border-radius:14px;
                background:#f8eeee;
              "
            >

              <small>
                Medições
              </small>

              <strong
                style="
                  display:block;
                  font-size:24px;
                  margin-top:4px;
                  color:#7f4444;
                "
              >
                ${data.glucoseValues.length}
              </strong>

            </div>


            <div
              style="
                padding:14px;
                border-radius:14px;
                background:#f8eeee;
              "
            >

              <small>
                Menor valor
              </small>

              <strong
                style="
                  display:block;
                  font-size:24px;
                  margin-top:4px;
                  color:#7f4444;
                "
              >
                ${formatNumber(
                  data.glucoseMinimum
                )}
              </strong>

              <small>
                mg/dL
              </small>

            </div>


            <div
              style="
                padding:14px;
                border-radius:14px;
                background:#f8eeee;
              "
            >

              <small>
                Maior valor
              </small>

              <strong
                style="
                  display:block;
                  font-size:24px;
                  margin-top:4px;
                  color:#7f4444;
                "
              >
                ${formatNumber(
                  data.glucoseMaximum
                )}
              </strong>

              <small>
                mg/dL
              </small>

            </div>

          </div>

        </section>

      `;

    } else {

      glucoseSection = `

        <section class="card">

          <h3>
            🩸 Glicemia
          </h3>

          <p>
            Ainda não existem medições de glicemia
            com valor numérico para analisar.
          </p>

        </section>

      `;

    }


    /* =====================================================
       MENSAGEM QUANDO NÃO HÁ REGISTROS
    ===================================================== */

    const noRecordsMessage =
      data.total === 0
        ? `

          <section class="card">

            <h3>
              💡 Como funciona a análise
            </h3>

            <p>
              Quando você registrar refeições,
              glicemias, insulina, atividades e
              medicamentos, os dados serão
              analisados automaticamente aqui.
            </p>

            <p>
              No momento ainda não há registros
              suficientes para calcular médias
              ou tendências.
            </p>

          </section>

        `
        : "";


    /* =====================================================
       CONTEÚDO PRINCIPAL
    ===================================================== */

    container.innerHTML = `

      ${noRecordsMessage}


      <section class="card">

        <h3>
          📊 Resumo dos registros
        </h3>


        <div
          style="
            display:grid;
            grid-template-columns:
              repeat(2,minmax(0,1fr));
            gap:12px;
            margin-top:12px;
          "
        >

          <div
            style="
              padding:14px;
              border-radius:14px;
              background:#f8eeee;
            "
          >

            <small>
              Total
            </small>

            <strong
              style="
                display:block;
                font-size:24px;
                margin-top:4px;
                color:#7f4444;
              "
            >
              ${data.total}
            </strong>

          </div>


          <div
            style="
              padding:14px;
              border-radius:14px;
              background:#f8eeee;
            "
          >

            <small>
              🍽️ Refeições
            </small>

            <strong
              style="
                display:block;
                font-size:24px;
                margin-top:4px;
                color:#7f4444;
              "
            >
              ${data.meals}
            </strong>

          </div>


          <div
            style="
              padding:14px;
              border-radius:14px;
              background:#f8eeee;
            "
          >

            <small>
              🩸 Glicemias
            </small>

            <strong
              style="
                display:block;
                font-size:24px;
                margin-top:4px;
                color:#7f4444;
              "
            >
              ${data.glucose}
            </strong>

          </div>


          <div
            style="
              padding:14px;
              border-radius:14px;
              background:#f8eeee;
            "
          >

            <small>
              💉 Insulinas
            </small>

            <strong
              style="
                display:block;
                font-size:24px;
                margin-top:4px;
                color:#7f4444;
              "
            >
              ${data.insulin}
            </strong>

          </div>


          <div
            style="
              padding:14px;
              border-radius:14px;
              background:#f8eeee;
            "
          >

            <small>
              🏋️ Atividades
            </small>

            <strong
              style="
                display:block;
                font-size:24px;
                margin-top:4px;
                color:#7f4444;
              "
            >
              ${data.activity}
            </strong>

          </div>


          <div
            style="
              padding:14px;
              border-radius:14px;
              background:#f8eeee;
            "
          >

            <small>
              💊 Medicamentos
            </small>

            <strong
              style="
                display:block;
                font-size:24px;
                margin-top:4px;
                color:#7f4444;
              "
            >
              ${data.medication}
            </strong>

          </div>


          <div
            style="
              padding:14px;
              border-radius:14px;
              background:#f8eeee;
            "
          >

            <small>
              🩺 Consultas
            </small>

            <strong
              style="
                display:block;
                font-size:24px;
                margin-top:4px;
                color:#7f4444;
              "
            >
              ${data.consultations}
            </strong>

          </div>


          <div
            style="
              padding:14px;
              border-radius:14px;
              background:#f8eeee;
            "
          >

            <small>
              ⏱️ Atividade
            </small>

            <strong
              style="
                display:block;
                font-size:24px;
                margin-top:4px;
                color:#7f4444;
              "
            >
              ${formatNumber(
                data.activityMinutes
              )}
            </strong>

            <small>
              minutos
            </small>

          </div>

        </div>

      </section>


      ${glucoseSection}


      <section class="card">

        <h3>
          🏋️ Atividade física
        </h3>

        <p>
          Registros:
          <strong>
            ${data.activity}
          </strong>
        </p>

        <p>
          Tempo total:
          <strong>
            ${formatNumber(
              data.activityMinutes
            )}
            min
          </strong>
        </p>

      </section>


      <section class="card">

        <h3>
          💉 Insulina
        </h3>

        <p>
          Aplicações registradas:
          <strong>
            ${data.insulin}
          </strong>
        </p>

      </section>


      <section class="card">

        <h3>
          🍽️ Refeições
        </h3>

        <p>
          Refeições registradas:
          <strong>
            ${data.meals}
          </strong>
        </p>

      </section>


      <section class="card">

        <h3>
          💊 Medicamentos / Suplementos
        </h3>

        <p>
          Registros:
          <strong>
            ${data.medication}
          </strong>
        </p>

      </section>


      <section class="card">

        <h3>
          🩺 Consultas
        </h3>

        <p>
          Consultas registradas:
          <strong>
            ${data.consultations}
          </strong>
        </p>

      </section>

    `;

  }


  /* =======================================================
     INICIALIZAÇÃO
  ======================================================= */

  function initAnalysis() {

    /*
      Pequeno atraso para permitir que o app
      termine de carregar os dados.
    */

    setTimeout(
      function () {

        renderAnalysis();

      },
      100
    );

  }


  /* =======================================================
     DISPONIBILIZAR FUNÇÕES GLOBALMENTE
  ======================================================= */

  window.initAnalysis =
    initAnalysis;


  window.renderAnalysis =
    renderAnalysis;


  /* =======================================================
     DETECTAR ABERTURA DA TELA DE ANÁLISES
  ======================================================= */

  document.addEventListener(
    "click",
    function (event) {

      const button =
        event.target.closest(
          '[data-screen="analysisScreen"]'
        );


      if (!button) {
        return;
      }


      console.log(
        "ANÁLISES: tela aberta."
      );


      setTimeout(
        function () {

          renderAnalysis();

        },
        150
      );

    }
  );


  /* =======================================================
     OBSERVAR MUDANÇA DE TELA
  ======================================================= */

  function watchAnalysisScreen() {

    const screen =
      document.getElementById(
        "analysisScreen"
      );


    if (!screen) {
      return;
    }


    let lastHidden =
      screen.hidden;


    setInterval(
      function () {

        const currentHidden =
          screen.hidden;


        /*
          A tela acabou de ficar visível.
        */

        if (
          lastHidden === true &&
          currentHidden === false
        ) {

          console.log(
            "ANÁLISES: tela ficou visível."
          );


          renderAnalysis();

        }


        lastHidden =
          currentHidden;

      },
      300
    );

  }


  /* =======================================================
     DOM READY
  ======================================================= */

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      console.log(
        "ANÁLISES: módulo carregado."
      );


      /*
        Não mostramos a tela automaticamente.
        Apenas preparamos o módulo.
      */

      watchAnalysisScreen();

    }
  );


  /* =======================================================
     TENTATIVA DE INICIALIZAÇÃO CASO O SCRIPT
     SEJA CARREGADO DEPOIS DO DOM
  ======================================================= */

  if (
    document.readyState !==
    "loading"
  ) {

    setTimeout(
      function () {

        watchAnalysisScreen();

      },
      100
    );

  }

})();
