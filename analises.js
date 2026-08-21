/* =========================================================
   RECORDATÓRIO + REGISTROS
   MÓDULO DE ANÁLISES

   Versão corrigida:
   - Inicialização robusta em celular
   - Funciona quando a tela é criada depois do carregamento
   - Resumo geral
   - Gráfico de linha das glicemias
   - Identificação visual de glicemia em jejum
   - Análise por período do dia
========================================================= */

(function () {

  "use strict";

  const STORAGE_KEY =
    "recordatorio_registros_v01";

  let analysisScreen = null;
  let periodSelect = null;
  let startDateInput = null;
  let endDateInput = null;
  let refreshButton = null;
  let content = null;

  let initialized = false;
  let retryTimer = null;


  /* =====================================================
     INICIALIZAÇÃO
  ====================================================== */

  function findAnalysisScreen() {

    analysisScreen =
      document.getElementById("analysisScreen");

    return !!analysisScreen;
  }


  function initAnalysis() {

    if (initialized) {
      return true;
    }

    if (!findAnalysisScreen()) {
      return false;
    }

    createInterface();

    if (!periodSelect || !content) {
      return false;
    }

    bindEvents();

    setDefaultPeriod();

    renderAnalysis();

    initialized = true;

    console.log(
      "Módulo de análises inicializado."
    );

    return true;
  }


  /*
   * Em celulares, a tela pode ser criada depois
   * do DOMContentLoaded. Por isso fazemos algumas
   * tentativas adicionais.
   */
  function startAnalysisModule() {

    if (initAnalysis()) {
      return;
    }

    let attempts = 0;

    clearInterval(retryTimer);

    retryTimer =
      setInterval(
        function () {

          attempts++;

          if (initAnalysis()) {

            clearInterval(
              retryTimer
            );

            retryTimer = null;

            return;

          }

          if (attempts >= 30) {

            clearInterval(
              retryTimer
            );

            retryTimer = null;

            console.warn(
              "Não foi possível localizar a tela de análises."
            );

          }

        },
        300
      );

  }


  /* =====================================================
     OBSERVADOR PARA TELAS CRIADAS DINAMICAMENTE
  ====================================================== */

  function observePageChanges() {

    if (
      typeof MutationObserver ===
      "undefined"
    ) {

      return;

    }

    const observer =
      new MutationObserver(
        function () {

          if (!initialized) {

            initAnalysis();

          }

        }
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

  }


  /* =====================================================
     INTERFACE
  ====================================================== */

  function createInterface() {

    const main =
      analysisScreen.querySelector("main");

    if (!main) {
      return;
    }

    main.innerHTML = `

      <section class="card">

        <h2>
          📊 Análises
        </h2>

        <p
          style="
            color:#777;
            font-size:14px;
            line-height:1.5;
            margin-top:0;
          "
        >
          Consulte um resumo dos seus registros
          e acompanhe a evolução das glicemias.
        </p>


        <div
          style="
            margin-bottom:16px;
          "
        >

          <label
            for="analysisPeriod"
            style="
              display:block;
              margin-bottom:7px;
              font-size:14px;
              font-weight:600;
              color:#444;
            "
          >
            Período
          </label>

          <select
            id="analysisPeriod"
            style="
              width:100%;
              box-sizing:border-box;
              padding:13px 14px;
              border:1px solid #ddd;
              border-radius:12px;
              font-size:16px;
              background:#fff;
            "
          >

            <option value="7">
              Últimos 7 dias
            </option>

            <option value="30">
              Últimos 30 dias
            </option>

            <option value="90">
              Últimos 90 dias
            </option>

            <option value="custom">
              Personalizado
            </option>

          </select>

        </div>


        <div
          id="analysisCustomDates"
          hidden
        >

          <div
            style="
              margin-bottom:14px;
            "
          >

            <label
              for="analysisStartDate"
              style="
                display:block;
                margin-bottom:7px;
                font-size:14px;
                font-weight:600;
                color:#444;
              "
            >
              Data inicial
            </label>

            <input
              id="analysisStartDate"
              type="date"
              style="
                width:100%;
                box-sizing:border-box;
                padding:13px 14px;
                border:1px solid #ddd;
                border-radius:12px;
                font-size:16px;
                background:#fff;
              "
            >

          </div>


          <div>

            <label
              for="analysisEndDate"
              style="
                display:block;
                margin-bottom:7px;
                font-size:14px;
                font-weight:600;
                color:#444;
              "
            >
              Data final
            </label>

            <input
              id="analysisEndDate"
              type="date"
              style="
                width:100%;
                box-sizing:border-box;
                padding:13px 14px;
                border:1px solid #ddd;
                border-radius:12px;
                font-size:16px;
                background:#fff;
              "
            >

          </div>

        </div>


        <button
          type="button"
          id="refreshAnalysisButton"
          style="
            width:100%;
            border:0;
            border-radius:12px;
            padding:14px;
            margin-top:18px;
            background:#A85C5C;
            color:#fff;
            font-size:16px;
            font-weight:700;
            cursor:pointer;
          "
        >
          🔄 Atualizar análise
        </button>

      </section>


      <div id="analysisContent"></div>

    `;


    periodSelect =
      document.getElementById(
        "analysisPeriod"
      );

    startDateInput =
      document.getElementById(
        "analysisStartDate"
      );

    endDateInput =
      document.getElementById(
        "analysisEndDate"
      );

    refreshButton =
      document.getElementById(
        "refreshAnalysisButton"
      );

    content =
      document.getElementById(
        "analysisContent"
      );

  }


  /* =====================================================
     EVENTOS
  ====================================================== */

  function bindEvents() {

    if (periodSelect) {

      periodSelect.addEventListener(
        "change",
        function () {

          const customDates =
            document.getElementById(
              "analysisCustomDates"
            );

          if (!customDates) {
            return;
          }

          customDates.hidden =
            periodSelect.value !== "custom";

          if (
            periodSelect.value ===
            "custom"
          ) {

            setDefaultCustomDates();

          }

          renderAnalysis();

        }
      );

    }


    if (refreshButton) {

      refreshButton.addEventListener(
        "click",
        function () {

          renderAnalysis();

        }
      );

    }


    if (startDateInput) {

      startDateInput.addEventListener(
        "change",
        renderAnalysis
      );

    }


    if (endDateInput) {

      endDateInput.addEventListener(
        "change",
        renderAnalysis
      );

    }

  }


  /* =====================================================
     DATAS
  ====================================================== */

  function dateToKey(date) {

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        date.getDate()
      ).padStart(2, "0");

    return (
      year +
      "-" +
      month +
      "-" +
      day
    );

  }


  function setDefaultCustomDates() {

    const end =
      new Date();

    const start =
      new Date();

    start.setDate(
      start.getDate() - 6
    );

    if (startDateInput) {

      startDateInput.value =
        dateToKey(start);

    }

    if (endDateInput) {

      endDateInput.value =
        dateToKey(end);

    }

  }


  function setDefaultPeriod() {

    if (!periodSelect) {
      return;
    }

    periodSelect.value =
      "7";

    setDefaultCustomDates();

  }


  function getDateRange() {

    const end =
      new Date();

    end.setHours(
      0,
      0,
      0,
      0
    );

    const start =
      new Date(end);


    if (
      periodSelect &&
      periodSelect.value ===
      "custom"
    ) {

      const customStart =
        startDateInput
          ? startDateInput.value
          : "";

      const customEnd =
        endDateInput
          ? endDateInput.value
          : "";

      if (
        !customStart ||
        !customEnd
      ) {

        return null;

      }

      if (
        customStart >
        customEnd
      ) {

        return null;

      }

      return {

        start:
          customStart,

        end:
          customEnd

      };

    }


    const days =
      Number(
        periodSelect
          ? periodSelect.value
          : 7
      );

    start.setDate(
      start.getDate() -
      (days - 1)
    );

    return {

      start:
        dateToKey(start),

      end:
        dateToKey(end)

    };

  }


  /* =====================================================
     BANCO LOCAL
  ====================================================== */

  function loadDatabase() {

    try {

      const stored =
        localStorage.getItem(
          STORAGE_KEY
        );

      if (!stored) {

        return {
          records: [],
          trash: []
        };

      }

      const parsed =
        JSON.parse(stored);

      return {

        records:
          Array.isArray(
            parsed.records
          )
            ? parsed.records
            : [],

        trash:
          Array.isArray(
            parsed.trash
          )
            ? parsed.trash
            : []

      };

    } catch (error) {

      console.error(
        "Erro ao carregar dados das análises:",
        error
      );

      return {
        records: [],
        trash: []
      };

    }

  }


  function getFilteredRecords() {

    const database =
      loadDatabase();

    const range =
      getDateRange();

    if (!range) {
      return [];
    }

    return database.records.filter(
      function (record) {

        const date =
          String(
            record.date ||
            ""
          );

        return (
          date >= range.start &&
          date <= range.end
        );

      }
    );

  }


  /* =====================================================
     FORMATAÇÕES
  ====================================================== */

  function formatDate(value) {

    if (!value) {
      return "";
    }

    const parts =
      String(value).split("-");

    if (
      parts.length !== 3
    ) {

      return value;

    }

    return (
      parts[2] +
      "/" +
      parts[1] +
      "/" +
      parts[0]
    );

  }


  function escapeHTML(value) {

    return String(
      value ?? ""
    )
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }


  /* =====================================================
     RESUMOS
  ====================================================== */

  function countType(
    records,
    type
  ) {

    return records.filter(
      function (record) {

        return (
          record.type ===
          type
        );

      }
    ).length;

  }


  function getActivityMinutes(
    records
  ) {

    return records
      .filter(
        function (record) {

          return (
            record.type ===
            "activity"
          );

        }
      )
      .reduce(
        function (
          total,
          record
        ) {

          const value =
            Number(
              record.duration
            );

          return (
            total +
            (
              Number.isFinite(value)
                ? value
                : 0
            )
          );

        },
        0
      );

  }


  function getGlucoseRecords(
    records
  ) {

    return records
      .filter(
        function (record) {

          return (
            record.type ===
            "glucose"
          );

        }
      )
      .map(
        function (record) {

          return {

            date:
              String(
                record.date ||
                ""
              ),

            time:
              String(
                record.time ||
                ""
              ),

            value:
              Number(
                record.value
              ),

            kind:
              String(
                record.kind ||
                ""
              ).trim()

          };

        }
      )
      .filter(
        function (item) {

          return Number.isFinite(
            item.value
          );

        }
      )
      .sort(
        function (
          a,
          b
        ) {

          const first =
            a.date +
            " " +
            a.time;

          const second =
            b.date +
            " " +
            b.time;

          return first.localeCompare(
            second
          );

        }
      );

  }


  function average(values) {

    if (!values.length) {
      return null;
    }

    return (
      values.reduce(
        function (
          total,
          value
        ) {

          return total + value;

        },
        0
      ) /
      values.length
    );

  }


  function getInsulinUnits(
    records
  ) {

    return records
      .filter(
        function (record) {

          return (
            record.type ===
            "insulin"
          );

        }
      )
      .reduce(
        function (
          total,
          record
        ) {

          const candidates = [
            record.dose,
            record.units,
            record.insulinDose
          ];

          let value = 0;

          for (
            const candidate
            of candidates
          ) {

            const parsed =
              Number(candidate);

            if (
              Number.isFinite(
                parsed
              )
            ) {

              value = parsed;
              break;

            }

          }

          return total + value;

        },
        0
      );

  }


  /* =====================================================
     JEJUM
  ====================================================== */

  function isFastingGlucose(
    record
  ) {

    return (
      String(
        record.kind ||
        ""
      )
        .trim()
        .toLowerCase() ===
      "jejum"
    );

  }


  /* =====================================================
     PERÍODO DO DIA
  ====================================================== */

  function getDayPeriod(time) {

    if (!time) {
      return "unknown";
    }

    const parts =
      String(time).split(":");

    const hour =
      Number(parts[0]);

    if (
      !Number.isFinite(hour)
    ) {

      return "unknown";

    }

    if (
      hour >= 5 &&
      hour < 12
    ) {

      return "morning";

    }

    if (
      hour >= 12 &&
      hour < 18
    ) {

      return "afternoon";

    }

    return "night";

  }


  function getPeriodLabel(period) {

    const labels = {

      morning:
        "🌅 Manhã",

      afternoon:
        "☀️ Tarde",

      night:
        "🌙 Noite",

      unknown:
        "⏱️ Horário não informado"

    };

    return (
      labels[period] ||
      labels.unknown
    );

  }


  /* =====================================================
     ANÁLISE POR PERÍODO
  ====================================================== */

  function buildPeriodAnalysis(
    glucoseRecords
  ) {

    const periods = {

      fasting: [],
      morning: [],
      afternoon: [],
      night: [],
      unknown: []

    };


    glucoseRecords.forEach(
      function (record) {

        if (
          isFastingGlucose(
            record
          )
        ) {

          periods.fasting.push(
            record.value
          );

          return;

        }

        const period =
          getDayPeriod(
            record.time
          );

        periods[period].push(
          record.value
        );

      }
    );


    const order = [
      "fasting",
      "morning",
      "afternoon",
      "night",
      "unknown"
    ];


    let html = `

      <section
        class="card"
        style="
          margin-top:16px;
        "
      >

        <h2>
          🕐 Glicemias por período
        </h2>

        <p
          style="
            margin-top:0;
            color:#777;
            font-size:13px;
            line-height:1.5;
          "
        >
          As glicemias em jejum são separadas
          das demais medições da manhã.
        </p>

        <div
          style="
            display:flex;
            flex-direction:column;
            gap:12px;
          "
        >

    `;


    order.forEach(
      function (period) {

        const values =
          periods[period];

        if (
          period === "unknown" &&
          values.length === 0
        ) {

          return;

        }

        const avg =
          average(values);

        const min =
          values.length
            ? Math.min(...values)
            : null;

        const max =
          values.length
            ? Math.max(...values)
            : null;

        const label =
          period === "fasting"
            ? "🩸 Jejum"
            : getPeriodLabel(
                period
              );


        html += `

          <div
            style="
              border:1px solid #eee;
              border-radius:14px;
              padding:14px;
              background:#fff;
            "
          >

            <div
              style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:10px;
                margin-bottom:10px;
              "
            >

              <strong
                style="
                  color:#7f4444;
                  font-size:16px;
                "
              >
                ${label}
              </strong>

              <span
                style="
                  font-size:12px;
                  color:#777;
                "
              >
                ${values.length}
                ${
                  values.length === 1
                    ? "medição"
                    : "medições"
                }
              </span>

            </div>


            <div
              style="
                display:grid;
                grid-template-columns:
                  repeat(3, minmax(0, 1fr));
                gap:8px;
              "
            >

              <div
                style="
                  padding:10px;
                  background:#f8eeee;
                  border-radius:10px;
                  text-align:center;
                "
              >

                <div
                  style="
                    font-size:10px;
                    color:#777;
                  "
                >
                  Média
                </div>

                <strong
                  style="
                    display:block;
                    margin-top:4px;
                    color:#7f4444;
                  "
                >
                  ${
                    avg === null
                      ? "—"
                      : Math.round(avg) +
                        " mg/dL"
                  }
                </strong>

              </div>


              <div
                style="
                  padding:10px;
                  background:#f8eeee;
                  border-radius:10px;
                  text-align:center;
                "
              >

                <div
                  style="
                    font-size:10px;
                    color:#777;
                  "
                >
                  Mínima
                </div>

                <strong
                  style="
                    display:block;
                    margin-top:4px;
                    color:#7f4444;
                  "
                >
                  ${
                    min === null
                      ? "—"
                      : min +
                        " mg/dL"
                  }
                </strong>

              </div>


              <div
                style="
                  padding:10px;
                  background:#f8eeee;
                  border-radius:10px;
                  text-align:center;
                "
              >

                <div
                  style="
                    font-size:10px;
                    color:#777;
                  "
                >
                  Máxima
                </div>

                <strong
                  style="
                    display:block;
                    margin-top:4px;
                    color:#7f4444;
                  "
                >
                  ${
                    max === null
                      ? "—"
                      : max +
                        " mg/dL"
                  }
                </strong>

              </div>

            </div>

          </div>

        `;

      }
    );


    html += `

        </div>

      </section>

    `;


    return html;

  }


  /* =====================================================
     GRÁFICO
  ====================================================== */

  function buildGlucoseLineChart(
    glucoseRecords
  ) {

    if (
      !glucoseRecords.length
    ) {

      return `

        <section
          class="card"
          style="
            margin-top:16px;
          "
        >

          <h2>
            🩸 Evolução das glicemias
          </h2>

          <div class="empty-state">
            Não há glicemias registradas
            no período selecionado.
          </div>

        </section>

      `;

    }


    const values =
      glucoseRecords.map(
        function (item) {
          return item.value;
        }
      );


    const minValue =
      Math.min(...values);

    const maxValue =
      Math.max(...values);

    const averageValue =
      average(values);


    const chartWidth = 760;
    const chartHeight = 360;

    const left = 58;
    const right = 22;
    const top = 34;
    const bottom = 60;

    const plotWidth =
      chartWidth -
      left -
      right;

    const plotHeight =
      chartHeight -
      top -
      bottom;

    const valueRange =
      Math.max(
        maxValue - minValue,
        20
      );

    const chartMin =
      minValue -
      Math.max(
        valueRange * 0.12,
        5
      );

    const chartMax =
      maxValue +
      Math.max(
        valueRange * 0.12,
        5
      );

    const chartRange =
      Math.max(
        chartMax - chartMin,
        1
      );


    function xFor(index) {

      if (
        glucoseRecords.length === 1
      ) {

        return (
          left +
          plotWidth / 2
        );

      }

      return (
        left +
        (
          index /
          (
            glucoseRecords.length -
            1
          )
        ) *
        plotWidth
      );

    }


    function yFor(value) {

      return (
        top +
        (
          (
            chartMax -
            value
          ) /
          chartRange
        ) *
        plotHeight
      );

    }


    const points =
      glucoseRecords.map(
        function (
          item,
          index
        ) {

          return {

            x:
              xFor(index),

            y:
              yFor(item.value),

            value:
              item.value,

            date:
              item.date,

            time:
              item.time,

            kind:
              item.kind,

            fasting:
              isFastingGlucose(
                item
              )

          };

        }
      );


    const polyline =
      points
        .map(
          function (point) {

            return (
              point.x +
              "," +
              point.y
            );

          }
        )
        .join(" ");


    /* =================================================
       GRADE
    ================================================== */

    let gridHTML = "";

    const numberOfGridLines = 5;

    for (
      let index = 0;
      index < numberOfGridLines;
      index++
    ) {

      const ratio =
        index /
        (
          numberOfGridLines -
          1
        );

      const value =
        chartMax -
        (
          ratio *
          chartRange
        );

      const y =
        yFor(value);

      gridHTML += `

        <line
          x1="${left}"
          y1="${y}"
          x2="${chartWidth - right}"
          y2="${y}"
          stroke="#eeeeee"
          stroke-width="1"
        ></line>

        <text
          x="${left - 8}"
          y="${y + 4}"
          text-anchor="end"
          font-size="11"
          fill="#777"
        >
          ${Math.round(value)}
        </text>

      `;

    }


    const averageY =
      yFor(averageValue);


    /* =================================================
       MARCADORES
    ================================================== */

    let pointsHTML = "";


    points.forEach(
      function (point) {

        const label =
          formatDate(point.date) +
          (
            point.time
              ? " · " +
                point.time
              : ""
          ) +
          (
            point.fasting
              ? " · Jejum"
              : ""
          );


        if (point.fasting) {

          const size = 8;

          const diamondPoints = [

            point.x +
            "," +
            (
              point.y -
              size
            ),

            (
              point.x +
              size
            ) +
            "," +
            point.y,

            point.x +
            "," +
            (
              point.y +
              size
            ),

            (
              point.x -
              size
            ) +
            "," +
            point.y

          ].join(" ");


          pointsHTML += `

            <polygon
              points="${diamondPoints}"
              fill="#ffffff"
              stroke="#A85C5C"
              stroke-width="3"
            >

              <title>
                ${escapeHTML(label)}
                — ${point.value} mg/dL
              </title>

            </polygon>


            <text
              x="${point.x}"
              y="${point.y - 13}"
              text-anchor="middle"
              font-size="11"
              font-weight="700"
              fill="#7f4444"
            >
              ${point.value}
            </text>

          `;

        } else {

          pointsHTML += `

            <circle
              cx="${point.x}"
              cy="${point.y}"
              r="6"
              fill="#A85C5C"
              stroke="#ffffff"
              stroke-width="3"
            >

              <title>
                ${escapeHTML(label)}
                — ${point.value} mg/dL
              </title>

            </circle>


            <text
              x="${point.x}"
              y="${point.y - 12}"
              text-anchor="middle"
              font-size="11"
              font-weight="700"
              fill="#7f4444"
            >
              ${point.value}
            </text>

          `;

        }

      }
    );


    /* =================================================
       EIXO HORIZONTAL
    ================================================== */

    let labelsHTML = "";

    const maximumLabels = 6;

    let labelIndexes = [];


    if (
      glucoseRecords.length <=
      maximumLabels
    ) {

      labelIndexes =
        glucoseRecords.map(
          function (
            item,
            index
          ) {

            return index;

          }
        );

    } else {

      const step =
        (
          glucoseRecords.length -
          1
        ) /
        (
          maximumLabels -
          1
        );

      for (
        let index = 0;
        index < maximumLabels;
        index++
      ) {

        labelIndexes.push(
          Math.round(
            index * step
          )
        );

      }

    }


    labelIndexes =
      [
        ...new Set(
          labelIndexes
        )
      ];


    labelIndexes.forEach(
      function (index) {

        const point =
          points[index];

        if (!point) {
          return;
        }


        labelsHTML += `

          <text
            x="${point.x}"
            y="${chartHeight - 30}"
            text-anchor="middle"
            font-size="10"
            fill="#777"
          >
            ${formatDate(point.date)}
          </text>

          ${
            point.time
              ? `
                <text
                  x="${point.x}"
                  y="${chartHeight - 16}"
                  text-anchor="middle"
                  font-size="9"
                  fill="#999"
                >
                  ${escapeHTML(
                    point.time
                  )}
                </text>
              `
              : ""
          }

        `;

      }
    );


    /* =================================================
       TENDÊNCIA
    ================================================== */

    const firstValue =
      glucoseRecords[0].value;

    const lastValue =
      glucoseRecords[
        glucoseRecords.length - 1
      ].value;


    let trendText =
      "Estável";


    if (
      lastValue >
      firstValue
    ) {

      trendText =
        "Tendência de alta";

    } else if (
      lastValue <
      firstValue
    ) {

      trendText =
        "Tendência de queda";

    }


    return `

      <section
        class="card"
        style="
          margin-top:16px;
        "
      >

        <h2>
          🩸 Evolução das glicemias
        </h2>


        <p
          style="
            margin-top:0;
            color:#777;
            font-size:13px;
            line-height:1.5;
          "
        >

          ${glucoseRecords.length}
          ${
            glucoseRecords.length === 1
              ? "medição"
              : "medições"
          }
          no período.

        </p>


        <div
          style="
            width:100%;
            overflow-x:auto;
            overflow-y:hidden;
            margin-top:8px;
          "
        >

          <svg
            viewBox="
              0 0
              ${chartWidth}
              ${chartHeight}
            "
            width="100%"
            role="img"
            aria-label="Evolução das glicemias"
            style="
              display:block;
              min-width:640px;
            "
          >

            ${gridHTML}


            <line
              x1="${left}"
              y1="${top}"
              x2="${left}"
              y2="${chartHeight - bottom}"
              stroke="#dddddd"
              stroke-width="1"
            ></line>


            <line
              x1="${left}"
              y1="${chartHeight - bottom}"
              x2="${chartWidth - right}"
              y2="${chartHeight - bottom}"
              stroke="#dddddd"
              stroke-width="1"
            ></line>


            <line
              x1="${left}"
              y1="${averageY}"
              x2="${chartWidth - right}"
              y2="${averageY}"
              stroke="#999999"
              stroke-width="1.5"
              stroke-dasharray="7 6"
            ></line>


            <text
              x="${chartWidth - right}"
              y="${averageY - 7}"
              text-anchor="end"
              font-size="10"
              fill="#777"
            >
              Média
            </text>


            <polyline
              points="${polyline}"
              fill="none"
              stroke="#A85C5C"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></polyline>


            ${pointsHTML}

            ${labelsHTML}

          </svg>

        </div>


        <div
          style="
            display:flex;
            flex-wrap:wrap;
            gap:16px;
            align-items:center;
            margin-top:12px;
            padding:10px 12px;
            background:#faf7f5;
            border-radius:12px;
            font-size:12px;
            color:#666;
          "
        >

          <span
            style="
              display:inline-flex;
              align-items:center;
              gap:7px;
            "
          >

            <span
              aria-hidden="true"
              style="
                width:12px;
                height:12px;
                border-radius:50%;
                background:#A85C5C;
                display:inline-block;
              "
            ></span>

            Glicemia

          </span>


          <span
            style="
              display:inline-flex;
              align-items:center;
              gap:7px;
            "
          >

            <span
              aria-hidden="true"
              style="
                width:10px;
                height:10px;
                border:2px solid #A85C5C;
                background:#fff;
                transform:rotate(45deg);
                display:inline-block;
              "
            ></span>

            Glicemia em jejum

          </span>

        </div>


        <div
          style="
            display:grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap:10px;
            margin-top:12px;
          "
        >

          <div
            style="
              padding:13px;
              background:#f8eeee;
              border-radius:12px;
            "
          >

            <div
              style="
                font-size:11px;
                color:#777;
              "
            >
              Média
            </div>

            <strong
              style="
                display:block;
                margin-top:4px;
                font-size:18px;
                color:#7f4444;
              "
            >
              ${Math.round(
                averageValue
              )} mg/dL
            </strong>

          </div>


          <div
            style="
              padding:13px;
              background:#f8eeee;
              border-radius:12px;
            "
          >

            <div
              style="
                font-size:11px;
                color:#777;
              "
            >
              Tendência
            </div>

            <strong
              style="
                display:block;
                margin-top:4px;
                font-size:15px;
                color:#7f4444;
              "
            >
              ${trendText}
            </strong>

          </div>


          <div
            style="
              padding:13px;
              background:#f8eeee;
              border-radius:12px;
            "
          >

            <div
              style="
                font-size:11px;
                color:#777;
              "
            >
              Mínima
            </div>

            <strong
              style="
                display:block;
                margin-top:4px;
                font-size:18px;
                color:#7f4444;
              "
            >
              ${minValue} mg/dL
            </strong>

          </div>


          <div
            style="
              padding:13px;
              background:#f8eeee;
              border-radius:12px;
            "
          >

            <div
              style="
                font-size:11px;
                color:#777;
              "
            >
              Máxima
            </div>

            <strong
              style="
                display:block;
                margin-top:4px;
                font-size:18px;
                color:#7f4444;
              "
            >
              ${maxValue} mg/dL
            </strong>

          </div>

        </div>


        <p
          style="
            margin-bottom:0;
            margin-top:14px;
            color:#999;
            font-size:11px;
          "
        >
          Os losangos representam glicemias em jejum.
          Toque ou passe o cursor sobre um marcador
          para ver os detalhes da medição.
        </p>

      </section>

    `;

  }


  /* =====================================================
     CARDS DE RESUMO
  ====================================================== */

  function summaryCard(
    icon,
    label,
    value
  ) {

    return `

      <div
        style="
          padding:14px;
          background:#fff;
          border:1px solid #eee;
          border-radius:14px;
        "
      >

        <div
          style="
            font-size:20px;
            margin-bottom:5px;
          "
        >
          ${icon}
        </div>


        <div
          style="
            font-size:12px;
            color:#777;
          "
        >
          ${label}
        </div>


        <strong
          style="
            display:block;
            margin-top:4px;
            color:#7f4444;
            font-size:22px;
          "
        >
          ${value}
        </strong>

      </div>

    `;

  }


  /* =====================================================
     RENDERIZAÇÃO
  ====================================================== */

  function renderAnalysis() {

    /*
     * Se a tela ainda não existir, não fazemos nada.
     * O MutationObserver / retryTimer cuidará disso.
     */

    if (!content) {

      if (!initialized) {
        initAnalysis();
      }

      return;

    }


    const range =
      getDateRange();


    if (!range) {

      content.innerHTML = `

        <section
          class="card"
          style="
            margin-top:16px;
          "
        >

          <div class="empty-state">
            Confira as datas selecionadas.
          </div>

        </section>

      `;

      return;

    }


    const records =
      getFilteredRecords();


    const glucoseRecords =
      getGlucoseRecords(
        records
      );


    const glucoseValues =
      glucoseRecords.map(
        function (item) {
          return item.value;
        }
      );


    const glucoseAverage =
      average(
        glucoseValues
      );


    const glucoseMin =
      glucoseValues.length
        ? Math.min(...glucoseValues)
        : null;


    const glucoseMax =
      glucoseValues.length
        ? Math.max(...glucoseValues)
        : null;


    const meals =
      countType(
        records,
        "meal"
      );


    const glucose =
      countType(
        records,
        "glucose"
      );


    const insulin =
      countType(
        records,
        "insulin"
      );


    const activity =
      countType(
        records,
        "activity"
      );


    const medication =
      countType(
        records,
        "medication"
      );


    const consultation =
      countType(
        records,
        "consultation"
      );


    const activityMinutes =
      getActivityMinutes(
        records
      );


    const insulinUnits =
      getInsulinUnits(
        records
      );


    content.innerHTML = `

      <section
        class="card"
        style="
          margin-top:16px;
        "
      >

        <div
          style="
            font-size:13px;
            color:#777;
            margin-bottom:14px;
          "
        >

          Período:

          <strong>
            ${escapeHTML(
              formatDate(
                range.start
              )
            )}
          </strong>

          até

          <strong>
            ${escapeHTML(
              formatDate(
                range.end
              )
            )}
          </strong>

        </div>


        <div
          style="
            display:grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap:12px;
          "
        >

          ${summaryCard(
            "🍽️",
            "Refeições",
            meals
          )}

          ${summaryCard(
            "🩸",
            "Glicemias",
            glucose
          )}

          ${summaryCard(
            "💉",
            "Aplicações",
            insulin
          )}

          ${summaryCard(
            "🏋️",
            "Atividades",
            activity
          )}

          ${summaryCard(
            "💊",
            "Medicamentos",
            medication
          )}

          ${summaryCard(
            "🩺",
            "Consultas",
            consultation
          )}

        </div>

      </section>


      <section
        class="card"
        style="
          margin-top:16px;
        "
      >

        <h2>
          📈 Resumo
        </h2>


        <div
          style="
            display:flex;
            flex-direction:column;
            gap:10px;
          "
        >

          <div
            style="
              display:flex;
              justify-content:space-between;
              padding:10px 0;
              border-bottom:1px solid #eee;
            "
          >

            <span>
              Total de registros
            </span>

            <strong>
              ${records.length}
            </strong>

          </div>


          <div
            style="
              display:flex;
              justify-content:space-between;
              padding:10px 0;
              border-bottom:1px solid #eee;
            "
          >

            <span>
              Média das glicemias
            </span>

            <strong>
              ${
                glucoseAverage === null
                  ? "—"
                  : Math.round(
                      glucoseAverage
                    ) +
                    " mg/dL"
              }
            </strong>

          </div>


          <div
            style="
              display:flex;
              justify-content:space-between;
              padding:10px 0;
              border-bottom:1px solid #eee;
            "
          >

            <span>
              Menor glicemia
            </span>

            <strong>
              ${
                glucoseMin === null
                  ? "—"
                  : glucoseMin +
                    " mg/dL"
              }
            </strong>

          </div>


          <div
            style="
              display:flex;
              justify-content:space-between;
              padding:10px 0;
              border-bottom:1px solid #eee;
            "
          >

            <span>
              Maior glicemia
            </span>

            <strong>
              ${
                glucoseMax === null
                  ? "—"
                  : glucoseMax +
                    " mg/dL"
              }
            </strong>

          </div>


          <div
            style="
              display:flex;
              justify-content:space-between;
              padding:10px 0;
              border-bottom:1px solid #eee;
            "
          >

            <span>
              Atividade
            </span>

            <strong>
              ${activityMinutes} min
            </strong>

          </div>


          <div
            style="
              display:flex;
              justify-content:space-between;
              padding:10px 0;
            "
          >

            <span>
              Insulina
            </span>

            <strong>
              ${
                insulinUnits
                  ? insulinUnits + " U"
                  : "—"
              }
            </strong>

          </div>

        </div>

      </section>


      ${
        glucoseAverage !== null
          ? buildGlucoseLineChart(
              glucoseRecords
            )
          : `

            <section
              class="card"
              style="
                margin-top:16px;
              "
            >

              <h2>
                🩸 Evolução das glicemias
              </h2>

              <div class="empty-state">
                Não há glicemias registradas
                no período selecionado.
              </div>

            </section>

          `
      }


      ${buildPeriodAnalysis(
        glucoseRecords
      )}


      ${
        records.length === 0
          ? `

            <section
              class="card"
              style="
                margin-top:16px;
              "
            >

              <div class="empty-state">

                Nenhum registro encontrado
                no período selecionado.

              </div>

            </section>

          `
          : ""
      }

    `;

  }


  /* =====================================================
     ATUALIZAÇÃO APÓS SINCRONIZAÇÃO
  ====================================================== */

  document.addEventListener(
    "recordatorioSyncComplete",
    function () {

      /*
       * Caso o evento aconteça antes da tela
       * de análises existir, tentamos inicializar.
       */

      if (!initialized) {

        startAnalysisModule();

        return;

      }

      renderAnalysis();

    }
  );


  /* =====================================================
     VISIBILIDADE DA PÁGINA
  ====================================================== */

  document.addEventListener(
    "visibilitychange",
    function () {

      if (
        document.visibilityState ===
        "visible"
      ) {

        if (!initialized) {

          startAnalysisModule();

        } else {

          renderAnalysis();

        }

      }

    }
  );


  /* =====================================================
     INICIAR
  ====================================================== */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      function () {

        startAnalysisModule();

        observePageChanges();

      }
    );

  } else {

    startAnalysisModule();

    if (document.body) {
      observePageChanges();
    }

  }


})();
