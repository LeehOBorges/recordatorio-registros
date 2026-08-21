/* =========================================================
   ANÁLISES
   RECORDATÓRIO
   VERSÃO 0.2

   CORREÇÃO:
   - Funciona ao abrir a tela de Análises no celular
   - Inicialização independente do app.js
   - Renderização segura
   - Compatível com localStorage do app
========================================================= */


/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const ANALYSIS_STORAGE_KEY =
  "recordatorio_registros_v01";


/* =========================================================
   ESTADO
========================================================= */

let analysisInitialized =
  false;


/* =========================================================
   CARREGAR BANCO
========================================================= */

function loadAnalysisDatabase() {

  try {

    const stored =
      localStorage.getItem(
        ANALYSIS_STORAGE_KEY
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
      "Erro ao carregar dados para análise:",
      error
    );

    return {
      records: [],
      trash: []
    };
  }
}


/* =========================================================
   DATA
========================================================= */

function analysisDateKey(
  date
) {

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

  return `${year}-${month}-${day}`;
}


/* =========================================================
   FILTRAR REGISTROS
========================================================= */

function getAnalysisRecords() {

  const database =
    loadAnalysisDatabase();

  return database.records
    .filter(
      record =>
        record &&
        typeof record === "object"
    );
}


/* =========================================================
   GLICEMIAS
========================================================= */

function getAnalysisGlucoseRecords(
  records
) {

  return records
    .filter(
      record =>
        record.type ===
        "glucose"
    )
    .map(
      record => ({

        ...record,

        numericValue:
          Number(
            record.value
          )
      })
    )
    .filter(
      record =>
        Number.isFinite(
          record.numericValue
        )
    );
}


/* =========================================================
   MÉDIA
========================================================= */

function calculateAverage(
  values
) {

  if (
    !Array.isArray(values) ||
    values.length === 0
  ) {

    return 0;
  }

  const total =
    values.reduce(
      (
        sum,
        value
      ) =>
        sum +
        Number(value),
      0
    );

  return total /
    values.length;
}


/* =========================================================
   MENOR VALOR
========================================================= */

function calculateMinimum(
  values
) {

  if (
    !Array.isArray(values) ||
    values.length === 0
  ) {

    return 0;
  }

  return Math.min(
    ...values.map(
      Number
    )
  );
}


/* =========================================================
   MAIOR VALOR
========================================================= */

function calculateMaximum(
  values
) {

  if (
    !Array.isArray(values) ||
    values.length === 0
  ) {

    return 0;
  }

  return Math.max(
    ...values.map(
      Number
    )
  );
}


/* =========================================================
   FORMATAÇÃO
========================================================= */

function formatAnalysisNumber(
  value,
  decimals = 0
) {

  if (
    !Number.isFinite(
      Number(value)
    )
  ) {

    return "-";
  }

  return Number(value)
    .toLocaleString(
      "pt-BR",
      {
        minimumFractionDigits:
          decimals,

        maximumFractionDigits:
          decimals
      }
    );
}


/* =========================================================
   CRIAR RESUMO
========================================================= */

function createAnalysisSummary(
  records
) {

  const glucose =
    getAnalysisGlucoseRecords(
      records
    );

  const values =
    glucose.map(
      record =>
        record.numericValue
    );


  const average =
    calculateAverage(
      values
    );

  const minimum =
    calculateMinimum(
      values
    );

  const maximum =
    calculateMaximum(
      values
    );


  const meals =
    records.filter(
      record =>
        record.type ===
        "meal"
    );


  const insulin =
    records.filter(
      record =>
        record.type ===
        "insulin"
    );


  const activities =
    records.filter(
      record =>
        record.type ===
        "activity"
    );


  const medication =
    records.filter(
      record =>
        record.type ===
        "medication"
    );


  const activityMinutes =
    activities.reduce(
      (
        total,
        record
      ) =>
        total +
        Number(
          record.duration || 0
        ),
      0
    );


  return {

    glucoseCount:
      glucose.length,

    glucoseAverage:
      average,

    glucoseMinimum:
      minimum,

    glucoseMaximum:
      maximum,

    mealCount:
      meals.length,

    insulinCount:
      insulin.length,

    activityCount:
      activities.length,

    activityMinutes:
      activityMinutes,

    medicationCount:
      medication.length
  };
}


/* =========================================================
   ATUALIZAR ELEMENTO
========================================================= */

function updateAnalysisElement(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );

  if (!element) {
    return;
  }

  element.textContent =
    value;
}


/* =========================================================
   RENDERIZAR RESUMO
========================================================= */

function renderAnalysisSummary(
  records
) {

  const summary =
    createAnalysisSummary(
      records
    );


  updateAnalysisElement(
    "analysisGlucoseCount",
    summary.glucoseCount
  );


  updateAnalysisElement(
    "analysisGlucoseAverage",
    summary.glucoseCount > 0
      ? `${formatAnalysisNumber(
          summary.glucoseAverage,
          1
        )} mg/dL`
      : "-"
  );


  updateAnalysisElement(
    "analysisGlucoseMinimum",
    summary.glucoseCount > 0
      ? `${formatAnalysisNumber(
          summary.glucoseMinimum
        )} mg/dL`
      : "-"
  );


  updateAnalysisElement(
    "analysisGlucoseMaximum",
    summary.glucoseCount > 0
      ? `${formatAnalysisNumber(
          summary.glucoseMaximum
        )} mg/dL`
      : "-"
  );


  updateAnalysisElement(
    "analysisMealCount",
    summary.mealCount
  );


  updateAnalysisElement(
    "analysisInsulinCount",
    summary.insulinCount
  );


  updateAnalysisElement(
    "analysisActivityCount",
    summary.activityCount
  );


  updateAnalysisElement(
    "analysisActivityMinutes",
    `${summary.activityMinutes} min`
  );


  updateAnalysisElement(
    "analysisMedicationCount",
    summary.medicationCount
  );
}


/* =========================================================
   RENDERIZAR LISTA DE GLICEMIAS
========================================================= */

function renderAnalysisGlucoseList(
  records
) {

  const container =
    document.getElementById(
      "analysisGlucoseList"
    );

  if (!container) {
    return;
  }


  const glucose =
    getAnalysisGlucoseRecords(
      records
    )
    .sort(
      (a, b) => {

        const dateA =
          `${a.date || ""} ${
            a.time || ""
          }`;

        const dateB =
          `${b.date || ""} ${
            b.time || ""
          }`;

        return dateB.localeCompare(
          dateA
        );
      }
    );


  if (
    glucose.length === 0
  ) {

    container.innerHTML = `
      <div class="empty-state">
        Nenhuma glicemia registrada.
      </div>
    `;

    return;
  }


  container.innerHTML =
    glucose
      .map(
        record => `

          <div class="analysis-glucose-item">

            <div class="analysis-glucose-value">

              ${formatAnalysisNumber(
                record.numericValue
              )}
              mg/dL

            </div>

            <div class="analysis-glucose-info">

              <strong>
                ${escapeAnalysisHTML(
                  record.kind ||
                  "Glicemia"
                )}
              </strong>

              <span>
                ${escapeAnalysisHTML(
                  record.date ||
                  ""
                )}
                ${escapeAnalysisHTML(
                  record.time ||
                  ""
                )}
              </span>

            </div>

          </div>

        `
      )
      .join("");
}


/* =========================================================
   SEGURANÇA
========================================================= */

function escapeAnalysisHTML(
  value
) {

  return String(
    value ?? ""
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


/* =========================================================
   ANÁLISE POR PERÍODO
========================================================= */

function getAnalysisPeriodRecords(
  records,
  days
) {

  const now =
    new Date();

  const start =
    new Date(now);

  start.setHours(
    0,
    0,
    0,
    0
  );

  start.setDate(
    start.getDate() -
    (days - 1)
  );


  return records.filter(
    record => {

      if (!record.date) {
        return false;
      }

      const date =
        new Date(
          `${record.date}T00:00:00`
        );

      return (
        date >= start &&
        date <= now
      );
    }
  );
}


/* =========================================================
   RENDERIZAR PERÍODO
========================================================= */

function renderAnalysisPeriod(
  days = 7
) {

  const records =
    getAnalysisRecords();

  const periodRecords =
    getAnalysisPeriodRecords(
      records,
      days
    );


  renderAnalysisSummary(
    periodRecords
  );

  renderAnalysisGlucoseList(
    periodRecords
  );


  const periodElement =
    document.getElementById(
      "analysisPeriod"
    );

  if (periodElement) {

    periodElement.textContent =
      days === 7
        ? "Últimos 7 dias"
        : `Últimos ${days} dias`;
  }
}


/* =========================================================
   RENDER PRINCIPAL
========================================================= */

function renderAnalysis() {

  try {

    const records =
      getAnalysisRecords();


    renderAnalysisSummary(
      records
    );


    renderAnalysisGlucoseList(
      records
    );


    analysisInitialized =
      true;

  } catch (error) {

    console.error(
      "Erro ao renderizar análises:",
      error
    );
  }
}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

function initAnalysis() {

  if (
    analysisInitialized
  ) {

    renderAnalysis();

    return;
  }


  analysisInitialized =
    true;


  renderAnalysis();
}


/* =========================================================
   COMPATIBILIDADE
========================================================= */

window.initAnalysis =
  initAnalysis;

window.renderAnalysis =
  renderAnalysis;

window.renderAnalysisPeriod =
  renderAnalysisPeriod;


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    initAnalysis();

  }
);
