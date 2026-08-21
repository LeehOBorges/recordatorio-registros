```javascript
/* =========================================================
   RECORDATÓRIO + REGISTROS
   MÓDULO DE ANÁLISES
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
     CRIAR INTERFACE
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

      <section
        class="card analysis-controls"
      >

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
          e visualize a evolução das glicemias.
        </p>


        <div
          class="analysis-field"
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
          style="
            margin-top:14px;
          "
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


  function todayKey() {

    return dateToKey(
      new Date()
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


  function getGlucoseValues(
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

          const value =
            Number(
              record.value
            );


          return Number.isFinite(
            value
          )
            ? value
            : null;

        }
      )
      .filter(
        function (value) {

          return (
            value !== null
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


          let value = 0;


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
     GRÁFICO DE GLICEMIA
  ====================================================== */

  function buildGlucoseChart(
    records
  ) {

    const glucoseRecords =
      records
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


    if (
      glucoseRecords.length ===
      0
    ) {

      return `

        <section class="card">

          <h2>
            🩸 Glicemias
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


    const min =
      Math.min(
        ...values
      );


    const max =
      Math.max(
        ...values
      );


    const range =
      Math.max(
        max - min,
        1
      );


    let chartHTML = `

      <section class="card">

        <h2>
          🩸 Evolução das glicemias
        </h2>

        <div
          style="
            font-size:13px;
            color:#777;
            margin-bottom:14px;
          "
        >
          ${glucoseRecords.length}
          medição(ões)
        </div>

        <div
          style="
            display:flex;
            flex-direction:column;
            gap:10px;
          "
        >

    `;


    glucoseRecords.forEach(
      function (item) {

        const percentage =
          (
            (
              item.value -
              min
            ) /
            range
          ) *
          75 +
          25;


        chartHTML += `

          <div>

            <div
              style="
                display:flex;
                justify-content:space-between;
                gap:10px;
                font-size:12px;
                margin-bottom:4px;
                color:#555;
              "
            >

              <span>
                ${escapeHTML(
                  formatDate(
                    item.date
                  )
                )}
                ${
                  item.time
                    ? " · " +
                      escapeHTML(
                        item.time
                      )
                    : ""
                }
              </span>

              <strong>
                ${item.value}
                mg/dL
              </strong>

            </div>

            <div
              style="
                width:100%;
                height:12px;
                background:#f0dddd;
                border-radius:999px;
                overflow:hidden;
              "
            >

              <div
                style="
                  width:${percentage}%;
                  height:100%;
                  background:#A85C5C;
                  border-radius:999px;
                "
              ></div>

            </div>

          </div>

        `;

      }
    );


    chartHTML += `

        </div>

        <div
          style="
            margin-top:14px;
            padding-top:12px;
            border-top:1px solid #eee;
            font-size:12px;
            color:#777;
          "
        >

          Menor:
          <strong>
            ${min} mg/dL
          </strong>

          &nbsp; · &nbsp;

          Maior:
          <strong>
            ${max} mg/dL
          </strong>

        </div>

      </section>

    `;


    return chartHTML;

  }


  /* =====================================================
     TELA COMPLETA
  ====================================================== */

  function renderAnalysis() {

    if (!content) {

      return;

    }


    const range =
      getDateRange();


    if (!range) {

      content.innerHTML = `

        <section class="card">

          <div class="empty-state">

            Confira as datas selecionadas.

          </div>

        </section>

      `;

      return;

    }


    const records =
      getFilteredRecords();


    const glucoseValues =
      getGlucoseValues(
        records
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


      ${buildGlucoseChart(
        records
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
     CARD DE RESUMO
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
     REAGIR À SINCRONIZAÇÃO
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
```
