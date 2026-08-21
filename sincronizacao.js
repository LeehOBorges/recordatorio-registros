/* =========================================================
   RECORDATÓRIO + REGISTROS
   SINCRONIZAÇÃO COM SUPABASE

   Versão corrigida:
   - Mantém localStorage como cópia local
   - Usa Supabase como banco central
   - Faz merge entre dados locais e dados da nuvem
   - Atualiza o database em memória do app.js
   - Atualiza a interface após a sincronização
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
  ====================================================== */

  let syncClient = null;


  try {

    if (
      window.supabase &&
      typeof window.supabase.createClient ===
        "function"
    ) {

      syncClient =
        window.supabase.createClient(
          SUPABASE_URL,
          SUPABASE_PUBLISHABLE_KEY
        );

    }

  } catch (error) {

    console.error(
      "Erro ao iniciar cliente de sincronização:",
      error
    );

  }


  /* =====================================================
     CONTROLE
  ====================================================== */

  let syncing = false;

  let syncTimer = null;


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


  function cloneObject(object) {

    if (
      object === undefined ||
      object === null
    ) {

      return object;

    }


    try {

      return JSON.parse(
        JSON.stringify(object)
      );

    } catch (error) {

      console.error(
        "Erro ao clonar objeto:",
        error
      );


      return object;

    }

  }


  /* =====================================================
     LOCAL DATABASE
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
        "Erro ao ler registros locais:",
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

    } catch (error) {

      console.error(
        "Erro ao salvar registros locais:",
        error
      );

    }

  }


  /* =====================================================
     ATUALIZAR DATABASE DO APP.JS
  ====================================================== */

  function updateAppDatabase(
    mergedDatabase
  ) {

    if (!mergedDatabase) {
      return;
    }


    const records =
      Array.isArray(
        mergedDatabase.records
      )
        ? mergedDatabase.records
        : [];


    const trash =
      Array.isArray(
        mergedDatabase.trash
      )
        ? mergedDatabase.trash
        : [];


    /*
     * Se o app.js disponibilizar uma função pública
     * para atualizar o banco em memória, usamos ela.
     */

    if (
      typeof window.setDatabaseFromSync ===
      "function"
    ) {

      window.setDatabaseFromSync({
        records:
          cloneObject(records),

        trash:
          cloneObject(trash)

      });

      return;

    }


    /*
     * Compatibilidade adicional:
     * alguns projetos expõem o database em window.
     */

    if (
      window.database &&
      typeof window.database ===
        "object"
    ) {

      window.database.records =
        cloneObject(records);


      window.database.trash =
        cloneObject(trash);

    }

  }


  /* =====================================================
     LOCAL → SUPABASE
  ====================================================== */

  function localToCloudRow(
    record,
    userId,
    excluded = false
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

  function cloudRowToLocal(
    row
  ) {

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

      return null;

    }


    try {

      const {
        data,
        error
      } =
        await syncClient.auth.getUser();


      if (error) {

        console.warn(
          "Não foi possível identificar o usuário:",
          error
        );


        return null;

      }


      return (
        data &&
        data.user
          ? data.user
          : null
      );

    } catch (error) {

      console.error(
        "Erro ao identificar usuário:",
        error
      );


      return null;

    }

  }


  /* =====================================================
     CRIAR MAPA LOCAL
  ====================================================== */

  function createLocalMap(
    database
  ) {

    const map =
      new Map();


    if (!database) {

      return map;

    }


    const records =
      Array.isArray(
        database.records
      )
        ? database.records
        : [];


    const trash =
      Array.isArray(
        database.trash
      )
        ? database.trash
        : [];


    records.forEach(
      function (record) {

        if (
          !record ||
          !record.id
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


    trash.forEach(
      function (record) {

        if (
          !record ||
          !record.id
        ) {

          return;

        }


        const id =
          String(
            record.id
          );


        const item = {

          record:
            cloneObject(
              record
            ),

          excluded:
            true

        };


        const existing =
          map.get(id);


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
     BUSCAR REGISTROS DA NUVEM
  ====================================================== */

  async function loadCloudRows(
    userId
  ) {

    const {
      data,
      error
    } =
      await syncClient
        .from("registros")
        .select(
          "user_id, local_id, data, tipo, dados, excluido, atualizado_em"
        )
        .eq(
          "user_id",
          userId
        );


    if (error) {

      throw error;

    }


    return Array.isArray(data)
      ? data
      : [];

  }


  /* =====================================================
     MERGE LOCAL + NUVEM
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
          !row.local_id
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
         * Se o registro da nuvem for mais novo,
         * ele vence.
         */

        if (
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
     MAPA → DATABASE
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
     ENVIAR MERGE PARA SUPABASE
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
          !item.record ||
          !item.record.id
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


    const {
      error
    } =
      await syncClient
        .from("registros")
        .upsert(
          rows,
          {
            onConflict:
              "user_id,local_id"
          }
        );


    if (error) {

      throw error;

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

      console.error(
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

      console.error(
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

      console.error(
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

      console.error(
        "Erro ao atualizar lixeira:",
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


    if (!navigator.onLine) {

      console.log(
        "Sincronização ignorada: sem internet."
      );


      return;

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


      /*
       * Primeiro carregamos o estado local.
       */

      const localDatabase =
        loadLocalDatabase();


      const localMap =
        createLocalMap(
          localDatabase
        );


      /*
       * Depois buscamos os registros do usuário
       * no Supabase.
       */

      const cloudRows =
        await loadCloudRows(
          user.id
        );


      console.log(
        "Registros encontrados no Supabase:",
        cloudRows.length
      );


      /*
       * Fazemos o merge.
       */

      const merged =
        mergeData(
          localMap,
          cloudRows
        );


      /*
       * Transformamos o merge em database.
       */

      const mergedDatabase =
        buildLocalDatabase(
          merged
        );


      /*
       * Salva no localStorage.
       */

      saveLocalDatabase(
        mergedDatabase.records,
        mergedDatabase.trash
      );


      /*
       * IMPORTANTE:
       * Atualiza também o database que está
       * em memória no app.js.
       */

      updateAppDatabase(
        mergedDatabase
      );


      /*
       * Envia a união completa de volta ao Supabase.
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


      document.dispatchEvent(
        new CustomEvent(
          "recordatorioSyncComplete",
          {
            detail: {

              registros:
                mergedDatabase.records.length,

              lixeira:
                mergedDatabase.trash.length

            }

          }
        )
      );


      /*
       * Atualiza a interface.
       */

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
     INTERCEPTAR SAVE DATABASE
  ====================================================== */

  function installSaveHook() {

    if (
      typeof window.saveDatabase !==
      "function"
    ) {

      console.warn(
        "saveDatabase ainda não está disponível."
      );


      return false;

    }


    if (
      window.__recordatorioSaveHookInstalled
    ) {

      return true;

    }


    const originalSaveDatabase =
      window.saveDatabase;


    window.saveDatabase =
      function () {

        /*
         * Primeiro mantém o comportamento original
         * do aplicativo.
         */

        originalSaveDatabase();


        /*
         * Depois sincroniza em segundo plano.
         */

        syncNow(
          "salvamento"
        );

      };


    window.__recordatorioSaveHookInstalled =
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

    if (!syncClient) {

      return;

    }


    syncClient.auth.onAuthStateChange(
      function (
        event,
        session
      ) {

        console.log(
          "Sincronização - Auth:",
          event
        );


        if (
          event ===
          "SIGNED_IN" &&
          session
        ) {

          setTimeout(
            function () {

              syncNow(
                "login"
              );

            },
            500
          );

        }


        if (
          event ===
          "TOKEN_REFRESHED"
        ) {

          syncNow(
            "token"
          );

        }

      }
    );

  }


  /* =====================================================
     VISIBILIDADE / INTERNET
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

    if (syncTimer) {

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
     PRIMEIRA EXECUÇÃO
  ====================================================== */

  function init() {

    tryInstallSaveHook();

    installAuthListener();

    installVisibilityListener();

    installPeriodicSync();


    setTimeout(
      function () {

        syncNow(
          "inicializacao"
        );

      },
      1500
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


  /* =====================================================
     INICIAR
  ====================================================== */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  } else {

    init();

  }

})();
