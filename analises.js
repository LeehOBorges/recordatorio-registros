/* =========================================================
   ANÁLISES
   Versão completa para a tela analysisScreen
========================================================= */

(function () {

  "use strict";


  /* =======================================================
     FUNÇÕES AUXILIARES
  ======================================================= */

  function getAnalysisContainer() {

    const screen =
      document.getElementById("analysisScreen");

    if (!screen) {
      return null;
    }

    /*
      Criamos o container dinamicamente dentro da tela.
      Isso evita depender de um ID que não existe no index.
    */

    let container =
      document.getElementById("analysisContent");

    if (!container) {

      const main =
        screen.querySelector("main");

      if (!main) {
        return null;
      }

      container =
        document.createElement("div");

      container.id =
        "analysisContent";

      main.appendChild(container);
    }

    return container;
  }


  function escapeAnalysisHTML(value) {

    if (typeof escapeHTML === "function") {
      return escapeHTML(
        value == null ? "" : String(value)
      );
    }

    return String(
      value == null ? "" : value
    )
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function getRecordsForAnalysis() {

    if (
      typeof database === "undefined" ||
      !database ||
      !Array.isArray(database.records)
    ) {
      return [];
    }

    return database.records;
  }


  function formatNumber(value, decimals = 0) {

    const number =
      Number(value);

    if (!Number.isFinite(number)) {
      return "0";
    }

    return number.toLocaleString(
      "pt-BR",
      {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }
    );
  }


  /* =======================================================
     CÁLCULOS
  ======================================================= */

  function calculateAnalysis() {

    const records =
      getRecordsForAnalysis();


    const meals =
      records.filter(
        r => r && r.type === "meal"
      );


    const glucose =
      records.filter(
        r => r && r.type === "glucose"
      );


    const insulin =
      records.filter(
        r => r && r.type === "insulin"
      );


    const activity =
      records.filter(
        r => r && r.type === "activity"
      );


    const medication =
      records.filter(
        r => r && r.type === "medication"
      );


    let glucoseValues = [];


    glucose.forEach(
      record => {

        const possibleValues = [
          record.value,
          record.glucose,
          record.glucoseValue,
          record.bloodGlucose,
          record.mgdl
        ];


        for (
          const value of possibleValues
        ) {

          const number =
            Number(value);


          if (
            Number.isFinite(number) &&
            number > 0
          ) {

            glucoseValues.push(number);

            break;
          }
        }

      }
    );


    const glucoseAverage =
      glucoseValues.length
        ? glucoseValues.reduce(
            (sum, value) =>
              sum + value,
            0
          ) / glucoseValues.length
        : 0;


    const activityMinutes =
      activity.reduce(
        (total, record) => {

          const possibleValues = [
            record.duration,
            record.minutes,
            record.durationMinutes
          ];


          for (
            const value of possibleValues
          ) {

            const number =
              Number(value);


            if (
              Number.isFinite(number) &&
              number >= 0
            ) {

              return total + number;
            }

          }


          return total;

        },
        0
      );


    return {

      total:
        records.length,

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

      glucoseValues,

      glucoseAverage

    };

  }


  /* =======================================================
     RENDERIZAÇÃO
  ======================================================= */

  function renderAnalysis() {

    const container =
      getAnalysisContainer();


    if (!container) {

      console.error(
        "Análises: não foi possível encontrar analysisScreen/main."
      );

      return;
    }


    const data =
      calculateAnalysis();


    if (data.total === 0) {

      container.innerHTML = `

        <section class="card">

          <h3>
            📊 Resumo dos registros
          </h3>

          <div class="empty-state">

            Ainda não existem registros suficientes
            para gerar uma análise.

          </div>

        </section>

        <section class="card">

          <h3>
            💡 Como funciona
          </h3>

          <p>
            Conforme você registrar refeições,
            glicemias, insulina, atividades e
            medicamentos, os dados aparecerão
            automaticamente nesta tela.
          </p>

        </section>

      `;

      return;
    }


    let glucoseSection = "";


    if (data.glucoseValues.length > 0) {

      glucoseSection = `

        <section class="card">

          <h3>
            🩸 Glicemia
          </h3>

          <div
            style="
              display:grid;
              grid-template-columns:
                repeat(2, minmax(0, 1fr));
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
            Nenhuma medição de glicemia encontrada
            nos registros.
          </p>

        </section>

      `;

    }


    container.innerHTML = `

      <section class="card">

        <h3>
          📊 Resumo
        </h3>

        <div
          style="
            display:grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
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
              Total de registros
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
              Refeições
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
              Glicemias
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
              Insulinas
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
              Atividades
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
              Medicamentos
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

        </div>

      </section>


      ${glucoseSection}


      <section class="card">

        <h3>
          🏋️ Atividade física
        </h3>

        <p>

          Registros de atividade:
          <strong>
            ${data.activity}
          </strong>

        </p>

        <p>

          Tempo total:
          <strong>
            ${formatNumber(
              data.activityMinutes
            )} min
          </strong>

        </p>

      </section>


      <section class="card">

        <h3>
          💉 Insulina
        </h3>

        <p>

          Registros de aplicação:
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

    `;

  }


  /* =======================================================
     INICIALIZAÇÃO
  ======================================================= */

  function initAnalysis() {

    /*
      Pequeno atraso para garantir que o DOM e o
      restante do aplicativo já estejam disponíveis
      quando a tela for aberta.
    */

    setTimeout(
      function () {

        renderAnalysis();

      },
      0
    );

  }


  /* =======================================================
     DISPONIBILIZAR GLOBALMENTE
  ======================================================= */

  window.initAnalysis =
    initAnalysis;


  window.renderAnalysis =
    renderAnalysis;


  /* =======================================================
     PRIMEIRA TENTATIVA DE INICIALIZAÇÃO
  ======================================================= */

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      /*
        Não força a abertura da tela.
        Apenas deixa as funções disponíveis.
      */

      if (
        document.getElementById(
          "analysisScreen"
        )
      ) {

        console.log(
          "Módulo de Análises carregado."
        );

      }

    }
  );

})();
