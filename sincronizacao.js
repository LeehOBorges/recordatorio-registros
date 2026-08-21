```javascript
/* =========================================================
   RECORDATÓRIO + REGISTROS
   SINCRONIZAÇÃO COM SUPABASE

   VERSÃO CORRIGIDA

   - Reutiliza o cliente Supabase criado pelo index.html.
   - Não cria uma segunda instância do GoTrueClient.
   - Mantém o localStorage como cópia local.
   - Usa o Supabase como banco central.
   - Sincroniza por usuário autenticado.
   - Mantém registros excluídos na lixeira.
========================================================= */

(function () {

  "use strict";


  /* =====================================================
     CONFIGURAÇÃO
  ====================================================== */

  const STORAGE_KEY =
    "recordatorio_registros_v01";


  /* =====================================================
     CLIENTE SUPABASE
  ====================================================== */

  /*
   * O index.html já cria:
   *
   * window.supabaseClient
   *
   * Portanto NÃO criamos outro cliente aqui.
   *
   * Isso elimina:
   *
   * Multiple GoTrueClient instances detected
   */

  let syncClient =
    window.supabaseClient || null;


  /*
   * Caso o script seja executado antes de o index.html
   * terminar de criar o cliente, tentamos encontrá-lo
   * novamente quando necessário.
   */

  function getSyncClient() {

    if (
      window.supabaseClient &&
      typeof window.supabaseClient === "object"
    ) {

      syncClient =
        window.supabaseClient;

    }

    return syncClient;

  }


  /* =====================================================
     CONTROLE
  ====================================================== */

  let syncing = false;

  let syncTimer = null;

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


  function cloneObject(object) {

    if (
      object === null ||
      object === undefined
    ) {

      return object;

    }


    try {

      return JSON.parse(
        JSON.stringify(object)
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
     LOCAL DATABASE
  ====================================================== */

  function loadLocalDatabase() {

    try {

      /*
       * Tentamos primeiro a chave usada pelo app.
       */

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


      return true;

    } catch (error) {

      /*
       * Não deixamos um problema de storage
       * interromper a sincronização.
       */

      console.error(
        "Não foi possível salvar o banco local:",
        error
      );


      return false;

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

  function cloudRowToLocal(row) {

    const original =
      row &&
      row.dados &&
      typeof row.dados === "object"
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
      row.atualizado_em &&
      !original.updatedAt
    ) {

      original.updatedAt =
        row.atualizado_em;

    }


    return original;

  }


  /* =====================================================
     USUÁRIO ATUAL
  ====================================================== */

  async function getCurrentUser() {

    const client =
      getSyncClient();


    if (!client) {

      console.warn(
        "Cliente Supabase não disponível."
      );


      return null;

    }


    try {

      const result =
        await client.auth.getUser();


      if (
        result.error
      ) {

        console.warn(
          "Não foi possível identificar o usuário:",
          result.error
        );


        return null;

      }


      return (
        result.data &&
        result.data.user
          ? result.data.user
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
     MAPA LOCAL
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


    /*
     * REGISTROS ATIVOS
     */

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


    /*
     * LIXEIRA
     */

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
     BUSCAR NUVEM
  ====================================================== */

  async function loadCloudRows(
    userId
  ) {

    const client =
      getSyncClient();


    if (!client) {

      throw new Error(
        "Cliente Supabase não disponível."
      );

    }


    const {
      data,
      error
    } =
      await client
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


    return Array.isArray(
      data
    )
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


    if (
      !Array.isArray(
        cloudRows
      )
    ) {

      return merged;

    }


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


        /*
         * Só existe na nuvem.
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
         * Nuvem mais recente.
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


    /*
     * Ordenação dos registros.
     */

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


    /*
     * Lixeira mais recente primeiro.
     */

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

    const client =
      getSyncClient();


    if (!client) {

      throw new Error(
        "Cliente Supabase não disponível."
      );

    }


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
      await client
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
     ATUALIZAR ESTADO DO APP
  ====================================================== */

  function refreshApplication() {

    /*
     * O app.js pode manter seu próprio objeto database
     * em memória. Por isso tentamos usar uma função de
     * carregamento existente antes de apenas renderizar.
     */

    const reloadFunctions = [

      "loadDatabase",

      "loadData",

      "loadRecords",

      "initializeDatabase",

      "initDatabase",

      "loadAppData"

    ];


    for (
      let i = 0;
      i < reloadFunctions.length;
      i++
    ) {

      const functionName =
        reloadFunctions[i];


      if (
        typeof window[
          functionName
        ] === "function"
      ) {

        try {

          window[
            functionName
          ]();


        } catch (error) {

          console.warn(
            "Não foi possível executar " +
            functionName +
            ":",
            error
          );

        }

      }

    }


    /*
     * Renderizações conhecidas do aplicativo.
     */

    const renderFunctions = [

      "renderDashboard",

      "renderDiary",

      "renderConsultations",

      "renderTrash"

    ];


    renderFunctions.forEach(
      function (functionName) {

        if (
          typeof window[
            functionName
          ] === "function"
        ) {

          try {

            window[
              functionName
            ]();

          } catch (error) {

            console.warn(
              "Erro ao atualizar " +
              functionName +
              ":",
              error
            );

          }

        }

      }
    );

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


    const client =
      getSyncClient();


    if (!client) {

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
          "Nenhum usuário autenticado. " +
          "Sincronização aguardando login."
        );


        return;

      }


      /*
       * 1. Ler banco local.
       */

      const localDatabase =
        loadLocalDatabase();


      const localMap =
        createLocalMap(
          localDatabase
        );


      /*
       * 2. Ler banco central.
       */

      const cloudRows =
        await loadCloudRows(
          user.id
        );


      /*
       * 3. Unificar.
       */

      const merged =
        mergeData(
          localMap,
          cloudRows
        );


      /*
       * 4. Reconstruir banco local.
       */

      const mergedDatabase =
        buildLocalDatabase(
          merged
        );


      /*
       * 5. Salvar a união localmente.
       */

      saveLocalDatabase(
        mergedDatabase.records,
        mergedDatabase.trash
      );


      /*
       * 6. Enviar a união para o Supabase.
       */

      await uploadMergedData(
        merged,
        user.id
      );


      /*
       * 7. Log detalhado.
       */

      const result = {

        motivo:
          reason,

        registros:
          mergedDatabase.records.length,

        lixeira:
          mergedDatabase.trash.length,

        nuvemAntes:
          cloudRows.length

      };


      console.log(
        "Sincronização concluída:",
        result
      );


      /*
       * 8. Evento público.
       */

      document.dispatchEvent(
        new CustomEvent(
          "recordatorioSyncComplete",
          {
            detail:
              result
          }
        )
      );


      /*
       * 9. Atualizar aplicação.
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
      saveHookInstalled
    ) {

      return true;

    }


    if (
      typeof window.saveDatabase !==
      "function"
    ) {

      return false;

    }


    /*
     * Guardamos a função original.
     */

    const originalSaveDatabase =
      window.saveDatabase;


    /*
     * Criamos o wrapper.
     */

    window.saveDatabase =
      function () {

        /*
         * Primeiro deixa o app salvar normalmente.
         */

        const result =
          originalSaveDatabase.apply(
            this,
            arguments
          );


        /*
         * Depois sincroniza em segundo plano.
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


    console.log(
      "Hook de sincronização instalado."
    );


    return true;

  }


  /* =====================================================
     TENTAR INSTALAR SAVE HOOK
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
     AUTH LISTENER
  ====================================================== */

  function installAuthListener() {

    const client =
      getSyncClient();


    if (!client) {

      console.warn(
        "Não foi possível instalar listener do Auth."
      );


      return;

    }


    /*
     * Importante:
     *
     * O index.html já possui um onAuthStateChange.
     * Aqui não criamos outro cliente.
     *
     * Ter listeners no mesmo cliente é permitido.
     */

    client.auth.onAuthStateChange(
      function (
        event,
        session
      ) {

        console.log(
          "Sincronização Auth:",
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


          return;

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


          return;

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
     PRIMEIRA EXECUÇÃO
  ====================================================== */

  function init() {

    /*
     * O cliente já deve ter sido criado pelo index.html.
     */

    getSyncClient();


    /*
     * Hook do save.
     */

    tryInstallSaveHook();


    /*
     * Auth.
     */

    installAuthListener();


    /*
     * Eventos da página.
     */

    installVisibilityListener();


    /*
     * Sincronização periódica.
     */

    installPeriodicSync();


    /*
     * Primeira sincronização.
     */

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


  /*
   * Disponibiliza também uma função de diagnóstico.
   */

  window.recordatorioSyncStatus =
    function () {

      return {

        client:
          Boolean(
            getSyncClient()
          ),

        syncing:
          syncing,

        online:
          navigator.onLine,

        saveHook:
          saveHookInstalled

      };

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
```
