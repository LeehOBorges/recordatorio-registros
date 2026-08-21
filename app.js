/* =========================================================
   CONSULTAS — HOME
========================================================= */

function renderConsultationsHome() {

  let container =
    document.getElementById(
      "consultationsHomePanel"
    );

  if (!container) {

    const timeline =
      document.getElementById(
        "timeline"
      );

    if (!timeline) return;

    container = document.createElement("div");
    container.id = "consultationsHomePanel";
    container.className = "home-panel";

    timeline.parentNode.insertBefore(
      container,
      timeline.nextSibling
    );
  }

  const dateKey =
    formatDateKey(
      selectedDate
    );

  const todayConsultations =
    database.records.filter(
      r =>
        r.type === "consultation" &&
        r.date === dateKey
    );

  if (
    todayConsultations.length === 0
  ) {

    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <div class="panel-header">
      <h3>🩺 Consultas do Dia</h3>
    </div>

    <div class="panel-content">

      ${
        todayConsultations
          .map(c => `

            <div class="consultation-card">

              <strong>
                ${escapeHTML(c.time)}
                -
                ${escapeHTML(
                  c.specialty ||
                  "Consulta"
                )}
              </strong>

              <p>
                ${escapeHTML(
                  c.professional ||
                  ""
                )}
              </p>

              ${
                c.location
                  ? `
                    <small>
                      📍
                      ${escapeHTML(
                        c.location
                      )}
                    </small>
                  `
                  : ""
              }

            </div>

          `)
          .join("")
      }

    </div>
  `;
}


/* =========================================================
   CONSULTAS — TELA DEDICADA
========================================================= */

function renderConsultations() {

  const container =
    document.getElementById(
      "consultationsList"
    );

  if (!container) return;

  const consultations =
    database.records
      .filter(
        r =>
          r.type ===
          "consultation"
      )
      .sort(
        (a, b) =>
          (
            b.date +
            b.time
          ).localeCompare(
            a.date +
            a.time
          )
      );

  if (
    consultations.length === 0
  ) {

    container.innerHTML = `
      <div class="empty-state">
        Nenhuma consulta agendada ou registrada.
      </div>
    `;

    return;
  }

  container.innerHTML =
    consultations
      .map(c => `

        <div class="card">

          <div class="card-header">

            <strong>
              ${escapeHTML(
                c.date
              )}
              às
              ${escapeHTML(
                c.time
              )}
            </strong>

            <span>
              ${escapeHTML(
                c.specialty ||
                "Consulta"
              )}
            </span>

          </div>

          <div class="card-body">

            <p>
              <strong>
                Profissional:
              </strong>

              ${escapeHTML(
                c.professional ||
                ""
              )}
            </p>

            ${
              c.location
                ? `
                  <p>
                    <strong>
                      Local:
                    </strong>

                    ${escapeHTML(
                      c.location
                    )}
                  </p>
                `
                : ""
            }

            ${
              c.reason
                ? `
                  <p>
                    <strong>
                      Motivo:
                    </strong>

                    ${escapeHTML(
                      c.reason
                    )}
                  </p>
                `
                : ""
            }

            ${
              c.note
                ? `
                  <p>
                    <strong>
                      Obs:
                    </strong>

                    ${escapeHTML(
                      c.note
                    )}
                  </p>
                `
                : ""
            }

          </div>

          <div class="card-actions">

            <button
              type="button"
              onclick="editRecord('${escapeHTML(
                c.id
              )}')"
            >
              ✏️ Editar
            </button>

            <button
              type="button"
              onclick="deleteRecord('${escapeHTML(
                c.id
              )}')"
            >
              🗑️ Excluir
            </button>

          </div>

        </div>

      `)
      .join("");
}


/* =========================================================
   MEDICAMENTOS NA HOME
========================================================= */

function renderMedicationHome() {

  const container =
    document.getElementById(
      "medicationHomePanel"
    );

  if (!container) return;

  if (
    !Array.isArray(
      medications
    ) ||
    medications.length === 0
  ) {

    container.innerHTML = `
      <div class="empty-state">
        Nenhum medicamento cadastrado.
      </div>
    `;

    return;
  }

  const dateKey =
    formatDateKey(
      selectedDate
    );

  const todayMedRecords =
    database.records.filter(
      r =>
        r.type === "medication" &&
        r.date === dateKey
    );

  container.innerHTML =
    medications
      .map(med => {

        const taken =
          todayMedRecords.some(
            r =>
              r.medicationId ===
              med.id
          );

        return `

          <div
            class="med-item ${
              taken
                ? "taken"
                : ""
            }"
          >

            <div>

              <strong>
                ${escapeHTML(
                  med.name
                )}
              </strong>

              <small>
                ${escapeHTML(
                  med.dosage ||
                  ""
                )}
              </small>

            </div>

            <button
              type="button"
              onclick="toggleMedicationTaken('${escapeHTML(
                med.id
              )}')"
            >
              ${
                taken
                  ? "✅ Tomado"
                  : "⚪ Tomar"
              }
            </button>

          </div>

        `;
      })
      .join("");
}


function toggleMedicationTaken(
  medId
) {

  const dateKey =
    formatDateKey(
      selectedDate
    );

  const existingIndex =
    database.records.findIndex(
      r =>
        r.type ===
          "medication" &&
        r.date ===
          dateKey &&
        r.medicationId ===
          medId
    );

  if (
    existingIndex !== -1
  ) {

    database.records.splice(
      existingIndex,
      1
    );

  } else {

    const med =
      medications.find(
        m =>
          m.id ===
          medId
      );

    database.records.push({

      id:
        generateId(),

      type:
        "medication",

      medicationId:
        medId,

      medicationName:
        med
          ? med.name
          : "Medicamento",

      date:
        dateKey,

      time:
        currentTime(),

      createdAt:
        new Date().toISOString()

    });
  }

  saveDatabase();

  renderDashboard();

  if (
    typeof renderAnalises ===
    "function"
  ) {

    renderAnalises();
  }
}


/* =========================================================
   DIÁRIO / HISTÓRICO
========================================================= */

function renderDiary() {

  const container =
    document.getElementById(
      "diaryList"
    );

  if (!container) return;

  const records =
    getTodayRecords();

  if (
    records.length === 0
  ) {

    container.innerHTML = `
      <div class="empty-state">
        Sem registros para o dia selecionado.
      </div>
    `;

    return;
  }

  container.innerHTML =
    records
      .map(
        createTimelineItem
      )
      .join("");
}


/* =========================================================
   TELA MAIS
========================================================= */

function renderMoreScreen() {

  renderTrash();
}


/* =========================================================
   LIXEIRA
========================================================= */

function renderTrash() {

  const container =
    document.getElementById(
      "trashList"
    );

  if (!container) return;

  if (
    !database.trash ||
    database.trash.length === 0
  ) {

    container.innerHTML = `
      <div class="empty-state">
        Lixeira vazia.
      </div>
    `;

    return;
  }

  container.innerHTML =
    database.trash
      .map(item => `

        <div class="trash-item">

          <div>

            <strong>
              ${escapeHTML(
                item.type
              )}
              -
              ${escapeHTML(
                item.date
              )}
            </strong>

            <small>
              Excluído em:
              ${
                item.deletedAt
                  ? new Date(
                      item.deletedAt
                    ).toLocaleString(
                      "pt-BR"
                    )
                  : ""
              }
            </small>

          </div>

          <button
            type="button"
            onclick="restoreFromTrash('${escapeHTML(
              item.id
            )}')"
          >
            🔄 Restaurar
          </button>

        </div>

      `)
      .join("");
}


/* =========================================================
   RESTAURAR DA LIXEIRA
========================================================= */

function restoreFromTrash(
  id
) {

  const itemIndex =
    database.trash.findIndex(
      t =>
        t.id === id
    );

  if (
    itemIndex === -1
  ) return;

  const [
    item
  ] =
    database.trash.splice(
      itemIndex,
      1
    );

  delete item.deletedAt;

  database.records.push(
    item
  );

  saveDatabase();

  renderDashboard();

  renderTrash();

  if (
    typeof renderDiary ===
    "function"
  ) {

    renderDiary();
  }

  if (
    typeof renderConsultations ===
    "function"
  ) {

    renderConsultations();
  }

  if (
    typeof renderAnalises ===
    "function"
  ) {

    renderAnalises();
  }
}


/* =========================================================
   BACKUP
========================================================= */

function exportBackup() {

  const data = {

    database,

    glucoseSettings,

    medications,

    exportedAt:
      new Date().toISOString()

  };

  const blob =
    new Blob(
      [
        JSON.stringify(
          data,
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const a =
    document.createElement(
      "a"
    );

  a.href =
    url;

  a.download =
    `backup_recordatorio_${formatDateKey(
      new Date()
    )}.json`;

  document.body.appendChild(
    a
  );

  a.click();

  a.remove();

  URL.revokeObjectURL(
    url
  );
}


/* =========================================================
   RESTAURAÇÃO DE BACKUP
========================================================= */

function importBackup(
  event
) {

  const file =
    event.target.files[0];

  if (!file) return;

  const reader =
    new FileReader();

  reader.onload =
    function(e) {

      try {

        const data =
          JSON.parse(
            e.target.result
          );

        if (
          data.database
        ) {

          database =
            data.database;

          if (
            !Array.isArray(
              database.records
            )
          ) {

            database.records =
              [];
          }

          if (
            !Array.isArray(
              database.trash
            )
          ) {

            database.trash =
              [];
          }

          saveDatabase();
        }

        if (
          data.glucoseSettings
        ) {

          glucoseSettings =
            data.glucoseSettings;

          saveGlucoseSettings();
        }

        if (
          data.medications
        ) {

          medications =
            data.medications;

          saveMedications();
        }

        alert(
          "Backup restaurado com sucesso!"
        );

        renderDashboard();

        renderDiary();

        renderConsultations();

        renderTrash();

        if (
          typeof renderAnalises ===
          "function"
        ) {

          renderAnalises();
        }

      }

      catch (err) {

        alert(
          "Erro ao importar o arquivo de backup."
        );

        console.error(
          err
        );
      }

    };

  reader.readAsText(
    file
  );
}


/* =========================================================
   ATUALIZAÇÃO GERAL APÓS SINCRONIZAÇÃO
========================================================= */

function renderAllScreens() {

  renderDashboard();

  renderDiary();

  renderConsultations();

  renderTrash();

  renderConsultationsHome();

  renderMedicationHome();

  if (
    typeof renderAnalises ===
    "function"
  ) {

    renderAnalises();
  }

  else if (
    typeof renderAnalysis ===
    "function"
  ) {

    renderAnalysis();
  }

  else if (
    typeof renderAnalytics ===
    "function"
  ) {

    renderAnalytics();
  }
}


/* =========================================================
   INICIALIZAÇÃO DA APLICAÇÃO
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    renderDashboard();

    renderConsultationsHome();

    renderMedicationHome();

    renderDiary();

    renderConsultations();

    renderTrash();

    /*
     * Se o arquivo de análises já estiver carregado,
     * atualiza as análises imediatamente.
     */

    if (
      typeof renderAnalises ===
      "function"
    ) {

      renderAnalises();
    }

    else if (
      typeof renderAnalysis ===
      "function"
    ) {

      renderAnalysis();
    }

    else if (
      typeof renderAnalytics ===
      "function"
    ) {

      renderAnalytics();
    }

  }
);
