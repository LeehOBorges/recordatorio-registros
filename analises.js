/* =========================================================
   RECORDATÓRIO + REGISTROS
   MÓDULO DE ANÁLISES
   Versão com gráfico de linha de glicemias
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


  /* =====================================================
     INICIALIZAÇÃO
  ====================================================== */

  function initAnalysis() {

    analysisScreen =
      document.getElementById(
        "analysisScreen"
      );


    if (!analysisScreen) {

      console.warn(
        "Tela de análises não encontrada."
      );

      return;

    }


    createInterface();

    bindEvents();

    setDefaultPeriod();

    renderAnalysis();

  }


  /* =====================================================
     INTERFACE
  ====================================================== */

  function createInterface() {

    const main =
      analysisScreen.querySelector(
        "main"
      );


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


      <div
        id="analysisContent"
      ></div>

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
            periodSelect.value !==
            "custom";


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

  function dateToKey(
    date
  ) {

    const year =
      date.getFullYear();


    const month =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        "0"
      );


    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      );


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
        dateToKey(
          start
        );

    }


    if (endDateInput) {

      endDateInput.value =
        dateToKey(
          end
        );

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


    let start =
      new Date(
        end
      );


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
      (
        days - 1
      )
    );


    return {

      start:
        dateToKey(
          start
        ),

      end:
        dateToKey(
          end
        )

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
        JSON.parse(
          stored
        );


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
          date >=
          range.start &&
          date <=
          range.end
        );

      }
    );

  }


  /* =====================================================
     FORMATAÇÕES
  ====================================================== */

  function formatDate(
    value
  ) {

    if (!value) {

      return "";

    }


    const parts =
      String(
        value
      ).split("-");


    if (
      parts.length !==
      3
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


  function escapeHTML(
    value
  ) {

    return String(
      value ??
      ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );

  }


  /* =====================================================
     CONTAGENS
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
              Number.isFinite(
                value
              )
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
              )

          };

        }
      )
      .filter(
        function (item) {

          return (
            Number.isFinite(
              item.value
            )
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


  function average(
    values
  ) {

    if (
      !values.length
    ) {

      return null;

    }


    return (
      values.reduce(
        function (
          total,
          value
        ) {

          return (
            total +
            value
          );

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


          let value =
            0;


          for (
            const candidate
            of candidates
          ) {

            const parsed =
              Number(
                candidate
              );


            if (
              Number.isFinite(
                parsed
              )
            ) {

              value =
                parsed;

              break;

            }

          }


          return (
            total +
            value
          );

        },
        0
      );

  }


  /* =====================================================
     GRÁFICO DE LINHA
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
        function (
          item
        ) {

          return item.value;

        }
      );


    const minValue =
      Math.min(
        ...values
      );


    const maxValue =
      Math.max(
        ...values
      );


    const averageValue =
      average(
        values
      );


    const paddingLeft =
      42;


    const paddingRight =
      18;


    const paddingTop =
      24;


    const paddingBottom =
      48;


    const width =
      720;


    const height =
      340;


    const plotWidth =
      width -
      paddingLeft -
      paddingRight;


    const plotHeight =
      height -
      paddingTop -
      paddingBottom;


    const valueRange =
      Math.max(
        maxValue -
        minValue,
        10
      );


    const chartMin =
      minValue -
      (
        valueRange *
        0.10
      );


    const chartMax =
      maxValue +
      (
        valueRange *
        0.10
      );


    const chartRange =
      Math.max(
        chartMax -
        chartMin,
        1
      );


    function xFor(
      index
    ) {

      if (
        glucoseRecords.length ===
        1
      ) {

        return (
          paddingLeft +
          (
            plotWidth /
            2
          )
        );

      }


      return (
        paddingLeft +
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


    function yFor(
      value
    ) {

      return (
        paddingTop +
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
              xFor(
                index
              ),

            y:
              yFor(
                item.value
              ),

            value:
              item.value,

            date:
              item.date,

            time:
              item.time

          };

        }
      );


    const polylinePoints =
      points
        .map(
          function (
            point
          ) {

            return (
              point.x +
              "," +
              point.y
            );

          }
        )
        .join(
          " "
        );


    const gridValues = [

      chartMax,

      chartMin +
        (
          chartRange *
          0.75
        ),

      chartMin +
        (
          chartRange *
          0.50
        ),

      chartMin +
        (
          chartRange *
          0.25
        ),

      chartMin

    ];


    let gridHTML =
      "";


    gridValues.forEach(
      function (
        value
      ) {

        const y =
          yFor(
            value
          );


        gridHTML += `

          <line
            x1="${paddingLeft}"
            y1="${y}"
            x2="${
              width -
              paddingRight
            }"
            y2="${y}"
            stroke="#eeeeee"
            stroke-width="1"
          ></line>

          <text
            x="${
              paddingLeft -
              7
            }"
            y="${
              y + 4
            }"
            text-anchor="end"
            font-size="11"
            fill="#777777"
          >
            ${
              Math.round(
                value
              )
            }
          </text>

        `;

      }
    );


    let pointsHTML =
      "";


    points.forEach(
      function (
        point,
        index
      ) {

        const shortDate =
          formatDate(
            point.date
          );


        const label =
          shortDate +
          (
            point.time
              ? " · " +
                point.time
              : ""
          );


        pointsHTML += `

          <g>

            <circle
              cx="${point.x}"
              cy="${point.y}"
              r="6"
              fill="#A85C5C"
              stroke="#ffffff"
              stroke-width="3"
            >
              <title>
                ${
                  escapeHTML(
                    label
                  )
                } — ${
                  point.value
                } mg/dL
              </title>
            </circle>

            <text
              x="${point.x}"
              y="${
                Math.max(
                  point.y - 12,
                  16
                )
              }"
              text-anchor="middle"
              font-size="11"
              font-weight="700"
              fill="#7f4444"
            >
              ${point.value}
            </text>

          </g>

        `;

      }
    );


    let labelsHTML =
      "";


    const maxLabels =
      7;


    points.forEach(
      function (
        point,
        index
      ) {

        if (
          glucoseRecords.length >
          maxLabels &&
          index %
            Math.ceil(
              glucoseRecords.length /
              maxLabels
            ) !==
            0 &&
          index !==
            glucoseRecords.length -
            1
        ) {

          return;

        }


        const shortLabel =
          formatDate(
            point.date
          ) +
          (
            point.time
              ? "<br>" +
                escapeHTML(
                  point.time
                )
              : ""
          );


        labelsHTML += `

          <text
            x="${point.x}"
            y="${
              height -
              20
            }"
            text-anchor="middle"
            font-size="10"
            fill="#777777"
          >
            ${shortLabel}
          </text>

        `;

      }
    );


    const averageY =
      yFor(
        averageValue
      );


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
          Cada ponto representa uma medição
          registrada no período selecionado.
        </p>


        <div
          style="
            width:100%;
            overflow-x:auto;
            overflow-y:hidden;
          "
        >

          <svg
            viewBox="
              0 0
              ${width}
              ${height}
            "
            width="100%"
            role="img"
            aria-label="Gráfico de evolução das glicemias"
            style="
              min-width:620px;
              display:block;
            "
          >

            ${gridHTML}


            <line
              x1="${paddingLeft}"
              y1="${paddingTop}"
              x2="${paddingLeft}"
              y2="${
                height -
                paddingBottom
              }"
              stroke="#dddddd"
              stroke-width="1"
            ></line>


            <line
              x1="${paddingLeft}"
              y1="${
                height -
                paddingBottom
              }"
              x2="${
                width -
                paddingRight
              }"
              y2="${
                height -
                paddingBottom
              }"
              stroke="#dddddd"
              stroke-width="1"
            ></line>


            <line
              x1="${paddingLeft}"
              y1="${averageY}"
              x2="${
                width -
                paddingRight
              }"
              y2="${averageY}"
              stroke="#999999"
              stroke-width="1"
              stroke-dasharray="6 5"
            ></line>


            <polyline
              points="${polylinePoints}"
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
            display:grid;
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
            gap:10px;
            margin-top:12px;
          "
        >

          <div
            style="
              padding:12px;
              background:#f8eeee;
              border-radius:12px;
              text-align:center;
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
                color:#7f4444;
              "
            >
              ${
                Math.round(
                  averageValue
                )
              }
              mg/dL
            </strong>

          </div>


          <div
            style="
              padding:12px;
              background:#f8eeee;
              border-radius:12px;
              text-align:center;
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
                color:#7f4444;
              "
            >
              ${minValue}
              mg/dL
            </strong>

          </div>


          <div
            style="
              padding:12px;
              background:#f8eeee;
              border-radius:12px;
              text-align:center;
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
                color:#7f4444;
              "
            >
              ${maxValue}
              mg/dL
            </strong>

          </div>

        </div>

      </section>

    `;

  }


  /* =====================================================
     CARDS
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

    if (!content) {

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
        function (
          item
        ) {

          return item.value;

        }
      );


    const glucoseAverage =
      average(
        glucoseValues
      );


    const glucoseMin =
      glucoseValues.length
        ? Math.min(
            ...glucoseValues
          )
        : null;


    const glucoseMax =
      glucoseValues.length
        ? Math.max(
            ...glucoseValues
          )
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
                glucoseAverage ===
                null
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
                glucoseMin ===
                null
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
                glucoseMax ===
                null
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
              ${activityMinutes}
              min
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
                  ? insulinUnits +
                    " U"
                  : "—"
              }
            </strong>

          </div>

        </div>

      </section>


      ${buildGlucoseLineChart(
        glucoseRecords
      )}


      ${
        records.length ===
        0
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

      renderAnalysis();

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
      initAnalysis
    );

  } else {

    initAnalysis();

  }

})();
