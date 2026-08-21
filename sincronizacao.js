/* =========================================================
   RECORDATÓRIO + REGISTROS
   SINCRONIZAÇÃO COM SUPABASE
   VERSÃO CORRIGIDA

   - Mantém localStorage como cópia local
   - Usa Supabase como banco central
   - NÃO cria múltiplas instâncias do Supabase Auth
   - Sincroniza após login
   - Sincroniza ao salvar
   - Sincroniza ao voltar para a página
   - Sincroniza quando a internet retorna
   - Sincroniza periodicamente
========================================================= */

(function () {

  "use strict";


  /* =====================================================
     CONFIGURAÇÃO
  ====================================================== */

  const SUPABASE_URL =
    "https://gutbveorftpahuyjonnv.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_L8XMa2cXo2aWaGHHMdP1Tw_JtjABUQi";

  const STORAGE_KEY =
    "recordatorio_registros_v01";


  /* =====================================================
     CLIENTE SUPABASE
     
     IMPORTANTE:
     Primeiro tenta reutilizar um cliente que já exista.
     Só cria um novo se realmente não existir.
  ====================================================== */

  let syncClient = null;

  function getSupabaseClient() {

    /*
     * Se o app principal já disponibilizou um cliente,
     * reutilizamos esse cliente.
     */

    if (
      window.supabaseClient &&
      typeof window.supabaseClient.auth?.getUser ===
        "function"
    ) {

      return window.supabaseClient;

    }


    /*
     * Algumas versões do app podem usar outro nome.
     */

    if (
      window.supabase &&
      window.supabase.auth &&
      typeof window.supabase.auth.getUser ===
        "function"
    ) {

      return window.supabase;

    }


    /*
     * Se window.supabase for a biblioteca, criamos
     * uma instância apenas uma vez e guardamos globalmente.
     */

    if (
      window.supabase &&
      typeof window.supabase.createClient ===
        "function"
    ) {

      if (
        window.__recordatorioSupabaseClient
      ) {

        return window.__recordatorioSupabaseClient;

      }


      try {

        window.__recordatorioSupabaseClient =
          window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY
          );


        return window.__recordatorioSupabaseClient;

      } catch (error) {

        console.error(
          "Erro ao criar cliente Supabase:",
          error
        );

        return null;

      }

    }


    return null;

  }


  syncClient =
    getSupabaseClient();


  /* =====================================================
     CONTROLE
  ====================================================== */

  let syncing = false;

  let syncTimer = null;

  let authListenerInstalled = false;

  let saveHookInstalled = false;


  /* =====================================================
     UTILITÁRIOS
  ====================================================== */

  function nowISO() {

    return new Date().toISOString();

  }


  function getTimestamp(record) {

    if (!record) {

      return nowISO();

    }


    return (
      record.deletedAt ||
      record.updatedAt ||
      record.createdAt ||
      nowISO()
    );

  }


  function getTimestampNumber(record) {

    const value =
      getTimestamp(record);

    const time =
      new Date(value).getTime();

    return Number.isFinite(time)
      ? time
      : 0;

  }


  /* =====================================================
     LOCALSTORAGE
  ====================================================== */

  function loadLocalDatabase() {

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
        "Erro ao ler banco local:",
        error
      );


      return {

        records: [],

        trash: []

      };

    }

  }


  function saveLocalDatabase(
    records,
    trash
  ) {

    try {

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({

          records:
            Array.isArray(records)
              ? records
              : [],

          trash:
            Array.isArray(trash)
              ? trash
              : []

        })
      );


      return true;

    } catch (error) {

      console.error(
        "Erro ao salvar banco local:",
        error
      );

      return false;

    }

  }


  function cloneObject(object) {

    try {

      return JSON.parse(
        JSON.stringify(
          object
        )
      );

    } catch (error) {

      console.error(
        "Erro ao copiar objeto:",
        error
      );

      return {};

    }

  }


  /* =====================================================
     LOCAL → SUPABASE
  ====================================================== */

  function localToCloudRow(
    record,
    userId,
    excluded
  ) {

    return {

      user_id:
        userId,

      local_id:
        String(
          record.id
        ),

      data:
        record.date ||
        null,

      tipo:
        record.type ||
        null,

      dados:
        cloneObject(
          record
        ),

      excluido:
        Boolean(
          excluded
        ),

      atualizado_em:
        getTimestamp(
          record
        )

    };

  }


  /* =====================================================
     SUPABASE → LOCAL
  ====================================================== */

  function cloudRowToLocal(row) {

    const original =
      row &&
      row.dados &&
      typeof row.dados ===
        "object"

        ? cloneObject(
            row.dados
          )

        : {};


    original.id =
      row.local_id ||
      original.id;


    if (!original.date) {

      original.date =
        row.data ||
        "";

    }


    if (!original.type) {

      original.type =
        row.tipo ||
        "";

    }


    if (
      row.atualizado_em
    ) {

      /*
       * O timestamp da nuvem deve representar
       * a última atualização.
       */

      original.updatedAt =
        row.atualizado_em;

    }


    return original;

  }


  /* =====================================================
     USUÁRIO LOGADO
  ====================================================== */

  async function getCurrentUser() {

    if (!syncClient) {

      syncClient =
        getSupabaseClient();

    }


    if (!syncClient) {

      return null;

    }


    try {

      const result =
        await syncClient.auth.getUser();


      if (
        result &&
        result.error
      ) {

        console.warn(
          "Erro ao obter usuário Supabase:",
          result.error
        );

        return null;

      }


      return (
        result &&
        result.data &&
        result.data.user
      )
        ? result.data.user
        : null;

    } catch (error) {

      console.error(
        "Erro ao obter usuário:",
        error
      );

      return null;

    }

  }


  /* =====================================================
     MAPA LOCAL
  ====================================================== */

  function createLocalMap(
    database
  ) {

    const map =
      new Map();


    /*
     * Registros ativos
     */

    database.records.forEach(
      function (record) {

        if (
          !record ||
          record.id === undefined ||
          record.id === null
        ) {

          return;

        }


        const id =
          String(
            record.id
          );


        const existing =
          map.get(id);


        const item = {

          record:
            cloneObject(
              record
            ),

          excluded:
            false

        };


        if (
          !existing ||
          getTimestampNumber(
            item.record
          ) >=
          getTimestampNumber(
            existing.record
          )
        ) {

          map.set(
            id,
            item
          );

        }

      }
    );


    /*
     * Lixeira
     */

    database.trash.forEach(
      function (record) {

        if (
          !record ||
          record.id === undefined ||
          record.id === null
        ) {

          return;

        }


        const id =
          String(
            record.id
          );


        const existing =
          map.get(id);


        const item = {

          record:
            cloneObject(
              record
            ),

          excluded:
            true

        };


        if (
          !existing ||
          getTimestampNumber(
            item.record
          ) >=
          getTimestampNumber(
            existing.record
          )
        ) {

          map.set(
            id,
            item
          );

        }

      }
    );


    return map;

  }


  /* =====================================================
     BUSCAR SUPABASE
  ====================================================== */

  async function loadCloudRows(
    userId
  ) {

    const result =
      await syncClient
        .from("registros")
        .select(
          "user_id, local_id, data, tipo, dados, excluido, atualizado_em"
        )
        .eq(
          "user_id",
          userId
        );


    if (
      result.error
    ) {

      throw result.error;

    }


    return Array.isArray(
      result.data
    )
      ? result.data
      : [];

  }


  /* =====================================================
     MESCLAR LOCAL + NUVEM
  ====================================================== */

  function mergeData(
    localMap,
    cloudRows
  ) {

    const merged =
      new Map(
        localMap
      );


    cloudRows.forEach(
      function (row) {

        if (
          !row ||
          row.local_id === undefined ||
          row.local_id === null
        ) {

          return;

        }


        const id =
          String(
            row.local_id
          );


        const cloudRecord =
          cloudRowToLocal(
            row
          );


        const cloudItem = {

          record:
            cloudRecord,

          excluded:
            Boolean(
              row.excluido
            )

        };


        const existing =
          merged.get(id);


        /*
         * Não existe localmente:
         * usa o registro da nuvem.
         */

        if (!existing) {

          merged.set(
            id,
            cloudItem
          );

          return;

        }


        const localTime =
          getTimestampNumber(
            existing.record
          );


        const cloudTime =
          row.atualizado_em
            ? new Date(
                row.atualizado_em
              ).getTime()
            : getTimestampNumber(
                cloudRecord
              );


        /*
         * Se a data da nuvem for inválida,
         * não substituímos o local.
         */

        if (
          Number.isFinite(cloudTime) &&
          cloudTime >
            localTime
        ) {

          merged.set(
            id,
            cloudItem
          );

        }

      }
    );


    return merged;

  }


  /* =====================================================
     MAPA → BANCO LOCAL
  ====================================================== */

  function buildLocalDatabase(
    merged
  ) {

    const records = [];

    const trash = [];


    merged.forEach(
      function (item) {

        if (
          !item ||
          !item.record
        ) {

          return;

        }


        const record =
          cloneObject(
            item.record
          );


        if (
          item.excluded
        ) {

          trash.push(
            record
          );

        } else {

          records.push(
            record
          );

        }

      }
    );


    records.sort(
      function (a, b) {

        const dateA =
          String(
            a.date || ""
          );

        const dateB =
          String(
            b.date || ""
          );


        if (
          dateA !==
          dateB
        ) {

          return dateA.localeCompare(
            dateB
          );

        }


        return String(
          a.time || ""
        ).localeCompare(
          String(
            b.time || ""
          )
        );

      }
    );


    trash.sort(
      function (a, b) {

        return String(
          b.deletedAt ||
          b.updatedAt ||
          ""
        ).localeCompare(
          String(
            a.deletedAt ||
            a.updatedAt ||
            ""
          )
        );

      }
    );


    return {

      records,

      trash

    };

  }


  /* =====================================================
     ENVIAR PARA SUPABASE
  ====================================================== */

  async function uploadMergedData(
    merged,
    userId
  ) {

    const rows = [];


    merged.forEach(
      function (item) {

        if (
          !item ||
          !item.record
        ) {

          return;

        }


        if (
          item.record.id ===
          undefined ||
          item.record.id ===
          null
        ) {

          return;

        }


        rows.push(
          localToCloudRow(
            item.record,
            userId,
            item.excluded
          )
        );

      }
    );


    if (
      rows.length === 0
    ) {

      return;

    }


    const result =
      await syncClient
        .from("registros")
        .upsert(
          rows,
          {
            onConflict:
              "user_id,local_id"
          }
        );


    if (
      result.error
    ) {

      throw result.error;

    }

  }


  /* =====================================================
     ATUALIZAR INTERFACE
  ====================================================== */

  function refreshApplication() {

    try {

      if (
        typeof window.renderDashboard ===
        "function"
      ) {

        window.renderDashboard();

      }

    } catch (error) {

      console.warn(
        "Erro ao atualizar dashboard:",
        error
      );

    }


    try {

      if (
        typeof window.renderDiary ===
        "function"
      ) {

        window.renderDiary();

      }

    } catch (error) {

      console.warn(
        "Erro ao atualizar diário:",
        error
      );

    }


    try {

      if (
        typeof window.renderConsultations ===
        "function"
      ) {

        window.renderConsultations();

      }

    } catch (error) {

      console.warn(
        "Erro ao atualizar consultas:",
        error
      );

    }


    try {

      if (
        typeof window.renderTrash ===
        "function"
      ) {

        window.renderTrash();

      }

    } catch (error) {

      console.warn(
        "Erro ao atualizar lixeira:",
        error
      );

    }


    /*
     * Alguns app.js definem as funções apenas
     * no escopo global da página. Se existirem,
     * também atualizamos o painel de medicamentos.
     */

    try {

      if (
        typeof window.renderMedicationHome ===
        "function"
      ) {

        window.renderMedicationHome();

      }

    } catch (error) {

      console.warn(
        "Erro ao atualizar medicamentos:",
        error
      );

    }

  }


  /* =====================================================
     SINCRONIZAÇÃO PRINCIPAL
  ====================================================== */

  async function syncNow(
    reason = "manual"
  ) {

    if (syncing) {

      return;

    }


    if (
      !navigator.onLine
    ) {

      console.log(
        "Sincronização ignorada: sem internet."
      );

      return;

    }


    if (!syncClient) {

      syncClient =
        getSupabaseClient();

    }


    if (!syncClient) {

      console.warn(
        "Cliente Supabase não disponível."
      );

      return;

    }


    syncing = true;


    try {

      const user =
        await getCurrentUser();


      if (!user) {

        console.log(
          "Nenhum usuário autenticado. Sincronização aguardando login."
        );

        return;

      }


      const localDatabase =
        loadLocalDatabase();


      const localMap =
        createLocalMap(
          localDatabase
        );


      const cloudRows =
        await loadCloudRows(
          user.id
        );


      const merged =
        mergeData(
          localMap,
          cloudRows
        );


      const mergedDatabase =
        buildLocalDatabase(
          merged
        );


      /*
       * Atualiza primeiro o banco local.
       */

      saveLocalDatabase(
        mergedDatabase.records,
        mergedDatabase.trash
      );


      /*
       * Depois envia a união para a nuvem.
       */

      await uploadMergedData(
        merged,
        user.id
      );


      console.log(
        "Sincronização concluída:",
        {
          motivo:
            reason,

          registros:
            mergedDatabase.records.length,

          lixeira:
            mergedDatabase.trash.length
        }
      );


      /*
       * Evento público.
       */

      document.dispatchEvent(
        new CustomEvent(
          "recordatorioSyncComplete",
          {
            detail: {

              motivo:
                reason,

              registros:
                mergedDatabase.records.length,

              lixeira:
                mergedDatabase.trash.length

            }

          }
        )
      );


      refreshApplication();

    } catch (error) {

      console.error(
        "Erro na sincronização:",
        error
      );


      document.dispatchEvent(
        new CustomEvent(
          "recordatorioSyncError",
          {
            detail:
              error
          }
        )
      );

    } finally {

      syncing = false;

    }

  }


  /* =====================================================
     INTERCEPTAR saveDatabase
  ====================================================== */

  function installSaveHook() {

    if (
      saveHookInstalled ||
      window.__recordatorioSaveHookInstalled
    ) {

      saveHookInstalled = true;

      return true;

    }


    if (
      typeof window.saveDatabase !==
      "function"
    ) {

      return false;

    }


    const originalSaveDatabase =
      window.saveDatabase;


    window.saveDatabase =
      function () {

        let result;


        try {

          result =
            originalSaveDatabase.apply(
              this,
              arguments
            );

        } catch (error) {

          console.error(
            "Erro ao executar saveDatabase:",
            error
          );

          throw error;

        }


        /*
         * Sincronização em segundo plano.
         */

        setTimeout(
          function () {

            syncNow(
              "salvamento"
            );

          },
          0
        );


        return result;

      };


    window.__recordatorioSaveHookInstalled =
      true;

    saveHookInstalled =
      true;


    return true;

  }


  /* =====================================================
     TENTAR INSTALAR HOOK
  ====================================================== */

  function tryInstallSaveHook() {

    if (
      installSaveHook()
    ) {

      return;

    }


    setTimeout(
      tryInstallSaveHook,
      500
    );

  }


  /* =====================================================
     AUTENTICAÇÃO
  ====================================================== */

  function installAuthListener() {

    if (
      authListenerInstalled
    ) {

      return;

    }


    if (!syncClient) {

      syncClient =
        getSupabaseClient();

    }


    if (!syncClient) {

      console.warn(
        "Não foi possível instalar listener do Supabase."
      );

      return;

    }


    if (
      !syncClient.auth ||
      typeof syncClient.auth.onAuthStateChange !==
        "function"
    ) {

      return;

    }


    authListenerInstalled =
      true;


    syncClient.auth.onAuthStateChange(
      function (
        event,
        session
      ) {

        console.log(
          "Supabase Auth:",
          event
        );


        if (
          event ===
          "SIGNED_IN"
        ) {

          if (session) {

            setTimeout(
              function () {

                syncNow(
                  "login"
                );

              },
              500
            );

          }

        }


        if (
          event ===
          "INITIAL_SESSION"
        ) {

          if (session) {

            setTimeout(
              function () {

                syncNow(
                  "sessao_inicial"
                );

              },
              500
            );

          }

        }


        if (
          event ===
          "TOKEN_REFRESHED"
        ) {

          setTimeout(
            function () {

              syncNow(
                "token"
              );

            },
            0
          );

        }


        if (
          event ===
          "SIGNED_OUT"
        ) {

          console.log(
            "Usuário saiu. Sincronização pausada."
          );

        }

      }
    );

  }


  /* =====================================================
     VISIBILIDADE / INTERNET / FOCO
  ====================================================== */

  function installVisibilityListener() {

    document.addEventListener(
      "visibilitychange",
      function () {

        if (
          document.visibilityState ===
          "visible"
        ) {

          syncNow(
            "voltar_para_pagina"
          );

        }

      }
    );


    window.addEventListener(
      "online",
      function () {

        syncNow(
          "internet_restaurada"
        );

      }
    );


    window.addEventListener(
      "focus",
      function () {

        syncNow(
          "janela_ativa"
        );

      }
    );

  }


  /* =====================================================
     SINCRONIZAÇÃO PERIÓDICA
  ====================================================== */

  function installPeriodicSync() {

    if (
      syncTimer
    ) {

      clearInterval(
        syncTimer
      );

    }


    syncTimer =
      setInterval(
        function () {

          syncNow(
            "periodica"
          );

        },
        60000
      );

  }


  /* =====================================================
     API PÚBLICA
  ====================================================== */

  window.recordatorioSyncNow =
    function () {

      return syncNow(
        "manual"
      );

    };


  window.recordatorioGetSyncStatus =
    function () {

      return {

        syncing:
          syncing,

        online:
          navigator.onLine,

        supabase:
          Boolean(
            syncClient
          )

      };

    };


  /* =====================================================
     INICIALIZAÇÃO
  ====================================================== */

  function init() {

    /*
     * Espera o app principal terminar de criar
     * suas funções/cliente.
     */

    tryInstallSaveHook();

    installAuthListener();

    installVisibilityListener();

    installPeriodicSync();


    setTimeout(
      function () {

        /*
         * Tentamos novamente porque o cliente Supabase
         * ou a sessão podem ter sido inicializados
         * depois deste arquivo.
         */

        if (!syncClient) {

          syncClient =
            getSupabaseClient();

        }


        installAuthListener();

        syncNow(
          "inicializacao"
        );

      },
      1500
    );

  }


  /* =====================================================
     INICIAR
  ====================================================== */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );

  } else {

    init();

  }

})();
