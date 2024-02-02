// ==UserScript==
// @name         WykopLists
// @namespace    wykoplists
// @version      0.1
// @description  Skrypt wołania plusujących użytkowników
// @author       devRJ45
// @match        https://wykop.pl/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wykop.pl
// @grant        none
// @run-at       document-end
// ==/UserScript==

const style = document.createElement('style'); 
  style.innerHTML = `
  .wykop-lists-notification-container {
    position: fixed;
    top: 50px;
    right: 20px;
    z-index: 68;
  };

  li.account>ul>li.lists-settings a:before {
    -webkit-mask-size: 20px 20px;
    mask-size: 20px 20px;
    -webkit-mask-image: url(https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/text_to_speech/default/24px.svg);
    mask-image: url(https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/text_to_speech/default/24px.svg);
  }

  .wykop-list-modal section.modal {
    padding-top: 16px;
  }

  .wykop-list-modal section.modal-padding {
    padding: 16px;
  }
  p.lists-settings-footer {
    text-align: center;
    margin: 20px 0 0 0;
    background: var(--lilac);
    color: #91a7b3;
    font-size: 13px;
    padding: 8px 12px;
    border-radius: 3px;
  }
  p.lists-settings-footer a {
    font-weight: 600;
    color: var(--steelBluish);
  }
  ul.dropdown:not(.clear-styles) ul.actions[data-v-1635e6b9] li.icon-lists span:before {
    -webkit-mask-size: 15px 17px;
    mask-size: 15px 17px;
    -webkit-mask-image: url(https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/text_to_speech/default/24px.svg);
    mask-image: url(https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/text_to_speech/default/24px.svg);
  }
  div.wykop-lists-button {
    margin-top: 10px;
  }
  .wykop-lists-center {
    display: flex;
    justify-content: center;
  }
  .wykop-list-modal .modal-content {
    overflow: auto;
    max-height: calc(100vh - 138.56px);
    background: var(--lilac);
    color: #91a7b3;
    font-size: 13px;
    border-radius: 3px;
  }
  .wykop-list-modal .modal-content-padding {
    padding: 8px 12px;
  }
  .wykop-list-modal .profile-color {
    font-weight: bold;
  }

  .wykop-list-modal code {
    border: 1px solid rgba(64,64,66,0.95) !important;
  }

  .wykop-list-modal section.editor {
    padding: 0 !important;
    margin-left: 10px;
  }

  .wykop-list-modal textarea {
    padding: 10px !important;
    resize: vertical !important;
    display: block;
    background: var(--whitish);
    border: 0;
    width: 100%;
    color: var(--tuna);
    line-height: 1.4em;
    height: auto;
    font-size: 14px;
    -webkit-transition: opacity .2s ease;
    transition: opacity .2s ease;
    -webkit-appearance: none;
    -webkit-box-sizing: border-box;
    box-sizing: border-box;
    outline: none;
    max-height: 2000px;
    font-family: Arial,Verdana,DejaVu Sans;
  }

  .wl-comment-preview {
    background-color: var(--whitish); 
    color: var(--tuna); 
    padding: 10px;
  }

  li.account>ul>li.wykop-lists-settings a:before {
    -webkit-mask-size: 20px 20px;
    mask-size: 20px 20px;
    -webkit-mask-image: url(https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/text_to_speech/default/24px.svg);
    mask-image: url(https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/text_to_speech/default/24px.svg);
  }
  ul.dropdown:not(.clear-styles) ul.actions[data-v-1635e6b9] li.icon-lists span:before {
    -webkit-mask-size: 15px 17px;
    mask-size: 15px 17px;
    -webkit-mask-image: url(https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/text_to_speech/default/24px.svg);
    mask-image: url(https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/text_to_speech/default/24px.svg);
  }
  `;
  document.head.append(style);

class ListsWorker {

  _database = null;

  localStorageKeys = {
    config: 'wykop_lists_config',
  };

  broadcastChannel = null;

  masterTabLifetime = 5000;
  sendNextTimeout = 4000;
  sendNextTimeoutIfError = 60000;

  _defaultTemplate = `! Komentarz {cnum}/{ctotal}\n! {cusers}`;

  tabUUID = crypto.randomUUID();

  notification = null

  constructor (database) {
    this._database = database;
    this._database.onInitDatabase = this._checkStatusInDatabase;

    if (localStorage[this.localStorageKeys.config] == null) {
      localStorage[this.localStorageKeys.config] = JSON.stringify({});
    }
  
    this._initBroadcastChannel();
    this._initNotification();

    if (JSON.parse(localStorage[this.localStorageKeys.config])?.status != null) {
      this._startPing();
    } else {
      this._checkStatusInDatabase();
    }

    this._cleanDatabase();

  }

  _checkStatusInDatabase = async () => {
    await new Promise(r => setTimeout(r, 2000));

    if (JSON.parse(localStorage[this.localStorageKeys.config])?.status == null) {
      let countCommentsToWrite = await this._database.countCommentsToWrite();

      if (countCommentsToWrite > 0) {
        localStorage[this.localStorageKeys.config] = JSON.stringify({
          ...JSON.parse(localStorage[this.localStorageKeys.config]),
          status: 'processing'
        });
        this._startPing();
      }
    }
  }

  _cleanDatabase = async () => {
    await new Promise(r => setTimeout(r, 2000));

    let config = JSON.parse(localStorage[this.localStorageKeys.config]);

    if (config.lastCleaningDatabse == null) {
      await this._database.cleanDatabase();
      localStorage[this.localStorageKeys.config] = JSON.stringify({
        ...JSON.parse(localStorage[this.localStorageKeys.config]),
        lastCleaningDatabse: Date.now(),
      });
      return;
    }

    if (config.lastCleaningDatabse < (Date.now() - 1000 * 60 * 60 * 12)) {
      await this._database.cleanDatabase();
      localStorage[this.localStorageKeys.config] = JSON.stringify({
        ...JSON.parse(localStorage[this.localStorageKeys.config]),
        lastCleaningDatabse: Date.now(),
      });
      return;
    }
  }

  _startPing (withoutDelay = false) {
    setInterval(() => this._ping(), this.masterTabLifetime);
    if (withoutDelay) {
      this._ping();
    }
  }

  _initBroadcastChannel () {
    this.broadcastChannel = new BroadcastChannel("wykop_lists");
    this.broadcastChannel.onmessage = this._onBroadcastMessage;
  }

  _onBroadcastMessage = (event) => {
    this._updateNotification();

    if (event.data === 'start') {
      this._startPing();
      return;
    }
    if (event.data === 'change_master') {
      this.onChangeMaster();
    }
  }

  _uuidIsMaster (uuid) {
    let masterTab = JSON.parse(localStorage[this.localStorageKeys.config]).masterTab;

    if (masterTab?.uuid == null) {
      return false;
    }

    return masterTab.uuid === uuid;
  }

  _masterTabIsOnline () {
    let masterTab = JSON.parse(localStorage[this.localStorageKeys.config]).masterTab;

    if (masterTab?.pingTimestamp == null) {
      return false;
    }

    return (masterTab.pingTimestamp + this.masterTabLifetime) > Date.now();
  }

  _setTabAsMaster(uuid) {
    let newMasterObject = {
      uuid: uuid,
      pingTimestamp: Date.now()
    };
    
    localStorage[this.localStorageKeys.config] = JSON.stringify({
      ...JSON.parse(localStorage[this.localStorageKeys.config]),
      masterTab: newMasterObject
    });

    this.broadcastChannel.postMessage('change_master');
    this.onChangeMaster();
  }

  _ping = (onlyPingUpdate = false) => {
    this._updateNotification();

    if (this._uuidIsMaster(this.tabUUID)) {
      let config = JSON.parse(localStorage[this.localStorageKeys.config]);
      let masterTab = config.masterTab;
      masterTab.pingTimestamp = Date.now();

      localStorage[this.localStorageKeys.config] = JSON.stringify({
        ...JSON.parse(localStorage[this.localStorageKeys.config]),
        masterTab: masterTab
      });

      if ((config.sendNextAt == null || Date.now() > config.sendNextAt) && config.status != 'pause' && config.status != null) {
        this._trySendNext();
      }

      return;
    }
    if (!this._masterTabIsOnline() && !onlyPingUpdate) {
      this._setTabAsMaster(this.tabUUID);
      this.onSetAsMaster();
    }
  }

  _setNextTimeout = (textStatus, isError = false) => {
    localStorage[this.localStorageKeys.config] = JSON.stringify({
      ...JSON.parse(localStorage[this.localStorageKeys.config]),
      sendNextAt: Date.now() + (isError ? this.sendNextTimeoutIfError : this.sendNextTimeout),
      textStatus: textStatus,
      status: isError ? 'error' : 'processing',
    });

    this._updateNotification();
  }

  _end = () => {
    localStorage[this.localStorageKeys.config] = JSON.stringify({
      ...JSON.parse(localStorage[this.localStorageKeys.config]),
      textStatus: 'Inicjalizacja',
      status: null,
    });
    this.broadcastChannel.postMessage('end');
    this._updateNotification();
    document.querySelector('section').__vue__.$toastr.Add({
      title: 'Wykop Lists',
      msg: 'Zawołano wszystkich :))',
      type: 'success'
    });
  }

  start = () => {
    localStorage[this.localStorageKeys.config] = JSON.stringify({
      ...JSON.parse(localStorage[this.localStorageKeys.config]),
      textStatus: 'Inicjalizacja',
      status: 'processing',
    });
    this.broadcastChannel.postMessage('start');
    this._updateNotification();
    this._startPing(true);
    document.querySelector('section').__vue__.$toastr.Add({
      title: 'Wykop Lists',
      msg: 'Komentarze będą dodawane w tle',
      type: 'success'
    });
  }

  _trySendNext = async () => {
    let nextComment = await this._database.getNextCommentToWrite();

    if (nextComment == null) {
      this._end();
      return;
    }

    try {
      let response = await fetch(`https://wykop.pl/api/v3/entries/${nextComment.entryId}/comments`, {
        headers: {
          'authorization': `Bearer ${localStorage.token}`,
        },
        method: 'POST',
        body: JSON.stringify({
          data: {
            content: nextComment.content,
            photo: null,
            embed: null,
            adult: false
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Api request problem');
      }

      this._database.setCommentStatusAsSent(nextComment.id);

      let commentsToWrite = await this._database.countCommentsToWrite();

      if (commentsToWrite <= 0) {
        this._end();
        return;
      }
      
      this._setNextTimeout(`Pozostało ${commentsToWrite} komentarzy do wysłania\n(Kliknij aby zapauzować)`, false);
    } catch (e) {
      this._setNextTimeout(`Pozostało ${commentsToWrite} komentarzy do wysłania\nLimit zapytań API.\nSpróbuję dodać za 1 minutę`, true);
    }
  }

  _togglePause = () => {
    let config = JSON.parse(localStorage[this.localStorageKeys.config]);

    localStorage[this.localStorageKeys.config] = JSON.stringify({
      ...JSON.parse(localStorage[this.localStorageKeys.config]),
      status: config.status == 'pause' ? 'processing' : 'pause',
    });
    this.broadcastChannel.postMessage('toggle_pause');
    this._updateNotification();
  }

  getCommentTemplate = () => {
    let config = JSON.parse(localStorage[this.localStorageKeys.config]);

    return config.template ?? this._defaultTemplate;
  }

  updateCommentTemplate = (templateText) => {
    localStorage[this.localStorageKeys.config] = JSON.stringify({
      ...JSON.parse(localStorage[this.localStorageKeys.config]),
      template: templateText,
    });
  }

  _updateNotification = () => {
    let config = JSON.parse(localStorage[this.localStorageKeys.config]);

    this.notification.message.innerText = config.textStatus ?? 'Inicjalizacja';

    this.notification.title.innerText = 'WykopLists';
    this.notification.wrapper.style.display = 'block';

    switch(config.status) {
      case 'pause':
        this.setNotificationType('info');  
        this.notification.title.innerText = 'WykopLists - PAUZA';
        break;
      case 'processing':
        this.setNotificationType('info');
        break;
      case 'error':
        this.setNotificationType('error');
        break;
      default:
        this.setNotificationType('warning');
        this.notification.wrapper.style.display = 'none';
    }
  }

  _initNotification = () => {
    if (this.notification == null) {
      this.createNotification();
    }

    this._updateNotification();
  }

  createNotification = () => {
    let notifyObject = {};
    
    notifyObject.wrapper = document.createElement('div');
    notifyObject.wrapper.classList.add('toast', 'toast-warning');
    notifyObject.wrapper.setAttribute('style', 'display: none;');
    
    notifyObject.title = document.createElement('div');
    notifyObject.title.classList.add('toast-title');
    notifyObject.title.innerText = 'WykopLists';

    notifyObject.message = document.createElement('div');
    notifyObject.message.classList.add('toast-message');
    notifyObject.message.innerText = '';

    notifyObject.wrapper.appendChild(notifyObject.title);
    notifyObject.wrapper.appendChild(notifyObject.message);

    notifyObject.container = document.createElement('div');
    notifyObject.container.classList.add('wykop-lists-notification-container', 'toast-container');

    notifyObject.container.appendChild(notifyObject.wrapper);

    notifyObject.wrapper.addEventListener('click', (e) => {
      this._togglePause();
    });

    document.body.appendChild(notifyObject.container);

    this.notification = notifyObject;
  }

  setNotificationType = (type) => {
    if (this.notification == null) {
      return;
    }

    this.notification.wrapper.classList.remove('toast-success', 'toast-warning', 'toast-info', 'toast-error');

    switch (type) {
      case 'success':
        this.notification.wrapper.classList.add('toast-success');
        break;
      case 'info':
        this.notification.wrapper.classList.add('toast-info');
        break;
      case 'error':
        this.notification.wrapper.classList.add('toast-error');
        break;
      case 'warning':
      default:
        this.notification.wrapper.classList.add('toast-warning');
        break;
    }
  }

  onChangeMaster = () => {};
  onSetAsMaster = () => {};

}

class CommentsDatabase {

  _DBOpenRequest = null;
  _database = null;

  constructor (databseName) {
    this._DBOpenRequest = window.indexedDB.open(databseName ?? 'WykopLists_Data');

    this._DBOpenRequest.onsuccess = this._onDatabaseSuccess;
    this._DBOpenRequest.onupgradeneeded = this._onDatabaseUpgradeNeeded;
    this._DBOpenRequest.onerror = this._onDatabaseError;
  }

  _onDatabaseSuccess = (e) => {
    this._database = this._DBOpenRequest.result;

    this.onInitDatabase();
  }

  _onDatabaseUpgradeNeeded = (e) => {
    const db = e.target.result;

    const commentsObjectStore = db.createObjectStore('comments', {keyPath: 'id', autoIncrement: true});
    commentsObjectStore.createIndex('entryId', 'entryId', {unique: false});
  }

  _onDatabaseError = (e) => {
    console.log(e);
    document.querySelector('section').__vue__.$toastr.Add({
      title: 'Wykop Lists',
      msg: 'Problem z bazą danych, dodatek nie działa :<<br/>Więcej info w konsoli.',
      type: 'error'
    });
  }

  cleanDatabase = async () => {
    let deleteTime = Date.now() - 1000 * 60 * 60 * 24;

    const request = this._database.transaction('comments', 'readwrite').objectStore('comments').openCursor(null, 'next');

    return new Promise(resolve => {
      request.onsuccess = (e) => {
        const cursor = e.target.result;

        if (cursor) {
          let result = cursor.value;

          if (result.sentAt != null && result.sentAt < deleteTime) {
            cursor.delete();
          }

          cursor.continue();
        } else {
          resolve();
        }
      }
    });
  }

  getCommentsByEntryId = (entryId) => {
    const objectStore = this._database.transaction('comments').objectStore('comments');

    const index = objectStore.index('entryId');

    index.getAll(entryId).onsuccess = (event) => {
      console.log(event);
    }

  }

  addCommentsToWrite = async (entryId, comments) => {
    let dbObjects = comments.map(content => {
      return {
        entryId: entryId,
        content: content,
        createdAt: Date.now(),
        sentAt: null
      }
    });

    return new Promise(resolve => {
      const objectStore = this._database.transaction('comments', 'readwrite').objectStore('comments');
      
      dbObjects.forEach((v) => {
        objectStore.add(v);
      });

      resolve();
    });
  }

  countCommentsToWrite = async () => {
    const request = this._database.transaction('comments').objectStore('comments').openCursor(null, 'next');

    let count = 0;

    return new Promise(resolve => {
      request.onsuccess = (e) => {
        const cursor = e.target.result;

        if (cursor) {
          let result = cursor.value;

          if (result.sentAt == null) {
            count++;
          }

          cursor.continue();
        } else {
          resolve(count);
        }
      }
    });
  }

  getNextCommentToWrite = async () => {
    const request = this._database.transaction('comments').objectStore('comments').openCursor(null, 'next');

    return new Promise(resolve => {
      request.onsuccess = (e) => {
        const cursor = e.target.result;

        if (cursor) {
          let result = cursor.value;

          if (result.sentAt == null) {
            return resolve(result);
          }

          cursor.continue();
        } else {
          resolve(null);
        }
      }
    });
  }

  setCommentStatusAsSent = async (commentId) => {
    let objectStore = this._database.transaction('comments', 'readwrite').objectStore('comments');
    
    return new Promise((resolve, reject) => {
      let commentRequest = objectStore.get(commentId);
      
      commentRequest.onsuccess = () => {
        let comment = commentRequest.result;

        if (comment == null) {
          return reject();
        }

        comment.sentAt = Date.now();

        let updateRequest = objectStore.put(comment);
        updateRequest.onsuccess = () => {
          return resolve(true);
        }
      }
    })
  }

  onInitDatabase = () => {};

}

class WykopLists {

  _database = null;
  _worker = null;

  _settingsButton = null;

  constructor () {
    this._database = new CommentsDatabase();
    this._worker = new ListsWorker(this._database);

    this._initSettingsButton();
  }

  _createModal = () => {
    let modal = document.createElement('div');
    modal.classList.add('wykop-list-modal')
    modal.innerHTML = `
      <div aria-expanded="true" class="v--modal-overlay">
        <div class="v--modal-background-click">
          <div class="v--modal-top-right"></div>
          <div class="v--modal-box v--modal">
            <section class="modal modal-padding">
              <header data-v-9de074aa="">
                <h3 data-v-9de074aa="" class="wykop-lists-modal-title"></h3>
                <button data-v-9de074aa="" class="wykop-lists-close-button">zamknij</button>
              </header>
                <div class="modal-content modal-content-padding">

                </div>
                
            </section>
          </div>
        </div>
      </div>`;
    modal.onclick = (e) => {
      if (e.target.classList.contains('v--modal-background-click') || e.target.classList.contains('wykop-lists-close-button')) {
        modal.remove();
      }
    };
    document.body.appendChild(modal);

    return {
      modal: modal,
      title: modal.querySelector('.wykop-lists-modal-title'),
      content: modal.querySelector('.modal-content'),
    }
  }

  _parseCommentTemplate = (text, cnum, ctotal, cusers) => {
    cusers = `${cusers} `;

    return text.replaceAll('{cnum}', cnum).replaceAll('{ctotal}', ctotal).replaceAll('{cusers}', cusers);
  }

  _checkCommentTemplate = (text) => {
    if (text.indexOf('{cusers}') <= -1) {
      return {
        error: 'cusers'
      };
    }

    return {
      success: true
    };
  }

  openSettingsModal = () => {
    let modal = this._createModal();
    modal.title.innerText = 'WykopLists - Ustawienia'

    modal.content.innerHTML = `
    <h3>Ustawienia komentarza</h3>
    <div style="display: flex; flex-direction: row">
      <div>
        Wartości między nawiasami zostaną podmienione:<br/>
        <strong>{cnum}</strong> - numer komentarza<br/>
        <strong>{ctotal}</strong> - liczba wzystkich komentarzy<br/>
        <strong>{cusers}</strong> - lista użytkowników<br/>
      </div>
      <div style="flex: 1; text-align: center; margin-left: 10px;">
        <textarea data-v-69cfea84="" rows="2" placeholder="Treść komentarza" maxlength="20000" style="height: 71px;"></textarea>
        <span class="wl-cusers-error" style="color: red; display: none;"><strong>{cusers}</strong> jest wymagane!</span>
      </div>
    </div>
    
    <h3>Podgląd komentarza</h3>
    <div class="wl-comment-preview">

    </div>
    
    <div class="button filled normal wide blue-color wykop-lists-button">
      <button data-v-50f00d5d class="target wl-save">Zapisz</button>
    </div>
    `;

    const textarea = modal.content.querySelector('textarea');
    const preview = modal.content.querySelector('.wl-comment-preview');
    const cusersError = modal.content.querySelector('.wl-cusers-error');
    const saveButton = modal.content.querySelector('button.wl-save');

    textarea.value = this._worker.getCommentTemplate();

    const loggedUsername = document.querySelector('section')?.__vue__?.$store?.getters['user/getUser']?.username ?? 'RJ45';
    const templateData = {
      cnum: 1,
      ctotal: 23,
      cusers: Array(15).fill(`@${loggedUsername}`).join(', '),
    };

    preview.innerText = this._parseCommentTemplate(textarea.value, templateData.cnum, templateData.ctotal, templateData.cusers);

    textarea.addEventListener('keyup', (e) => {
      let check = this._checkCommentTemplate(textarea.value);

      if (check.error == 'cusers') {
        cusersError.style.display = '';
        saveButton.setAttribute('disabled', 'true');
      } else {
        cusersError.style.display = 'none';
        saveButton.removeAttribute('disabled');
      }

      preview.innerText = this._parseCommentTemplate(textarea.value, templateData.cnum, templateData.ctotal, templateData.cusers);
    });

    saveButton.addEventListener('click', (e) => {
      this._worker.updateCommentTemplate(textarea.value)
      modal.modal.remove();
    })
  }

  _getEntryIdFromUrl = (url) => {
    let urlFragments = url.split('/');
    for (var i = 0; i < urlFragments.length; i++) {
      if (urlFragments[i].toLowerCase() == 'wpis') {
        return parseInt(urlFragments[i+1]);
      }
    }
    return null;
  }

  _getEntryVoters = async (entryId) => {
    let response = await fetch(`https://wykop.pl/api/v3/entries/${entryId}/votes`, {
      headers: {
        'Authorization': `Bearer ${localStorage.token}`
      }
    });
    let json = await response.json();

    return json?.data;
  }

  _createComments = (usersList, usersPerComment) => {
    const totalComments = Math.ceil(usersList.length/usersPerComment);

    const template = this._worker.getCommentTemplate();

    let chunks = [...Array(totalComments)].map(n => usersList.splice(0, usersPerComment));
    
    chunks = chunks.map(users => users.map(u => `@${u}`).join(', ')).map((users, i) => this._parseCommentTemplate(template, i+1, totalComments, users));

    return chunks;
  }

  _getLoggedProfileInfo = () => {
    let userColor = document.querySelector('section')?.__vue__?.$store?.getters['user/getUser']?.color ?? 'orange';
    let plColor = 'pomarańczka';
    let maxUsersInEntry = 50;

    switch(userColor) {
      case 'green':
        plColor = 'zielonka';
        maxUsersInEntry = 20;
        break;
      case 'burgundy':
        plColor = 'bordo';
        maxUsersInEntry = 150;
        break;
      case 'orange':
      default:
        plColor = 'pomarańczka';
        maxUsersInEntry = 50;
    }

    return {userColor, plColor, maxUsersInEntry};
  }

  openAppEntryModal = (entryId) => {
    let modal = this._createModal();
    modal.title.innerText = `Woładnie do wpisu #${entryId}`;

    modal.content.innerHTML = `
    <div data-v-99298700="" data-v-6b45e4be="" class="form-group" data-v-6d2da140="">
      <label data-v-99298700="">Zawołaj plusujących z tego wpisu:</label>
      <div data-v-99298700="" class="field">
        <input data-v-6486857b="" data-v-99298700="" type="text" class="wl-voters-url" placeholder="Link do wpisu z plusującymi" value="">
      </div>
      <div class="wykop-lists-center">
        <div class="button filled normal wide blue-color wykop-lists-button">
          <button class="target wl-get-voters" data-v-50f00d5d="">
            Pobierz plusujących ten wpis
          </button>
        </div>
      </div>
    </div>
    `;

    const getVotersButton = modal.content.querySelector('button.wl-get-voters');

    getVotersButton.addEventListener('click', async (e) => {
      getVotersButton.setAttribute('disabled', 'true');
      getVotersButton.innerText = 'Pobieranie...';

      const votersListUrl = modal.content.querySelector('input.wl-voters-url').value;

      let totalVotersCount = 0;
      let removedUsersCount = 0;
      let commentsToWrite = [];
      let profileInfo = this._getLoggedProfileInfo();

      try {
        let votersEntryId = this._getEntryIdFromUrl(votersListUrl);
        let voters = await this._getEntryVoters(votersEntryId);
        
        totalVotersCount = voters.length;

        voters = voters.filter(u => u.status !== 'removed').map(u => u.username);
        removedUsersCount = totalVotersCount - voters.length;

        commentsToWrite = this._createComments(voters, 50);

      } catch (err) {
        console.log(err);
        getVotersButton.removeAttribute('disabled');
        getVotersButton.innerText = 'Pobierz plusujących ten wpis';
        return;
      }
      
      modal.content.innerHTML = `
        <p>
          Liczba plusujących: <strong>${totalVotersCount}</strong><br>
          Zawołanych zostanie <strong>${totalVotersCount-removedUsersCount}</strong> użytkowników<span style="${removedUsersCount == 0 ? 'display: none;' : ''}"> poneiważ <strong>${removedUsersCount}</strong> użytkowników usunęło konta.</span><br>
          Twój kolor to <span class="${profileInfo.userColor}-profile profile-color">${profileInfo.plColor}</span>, więc możesz zawołać <strong>${profileInfo.maxUsersInEntry}</strong> użytkowników w jednym komentarzu.<br>
          Liczba komentarzy które trzeba wysłać żeby zawołać wszystkich: <strong>${commentsToWrite.length}</strong><br>
        </p>
        <div class="button filled normal wide blue-color wykop-lists-button">
          <button class="target wl-start" data-v-50f00d5d="">
            Rozpocznij wołanie
          </button>
        </div>

        <h3>Podgląd komentarzy:</h3>
        <div class="wl-preview-container"></div>
      `;

      const previewContainer = modal.content.querySelector('.wl-preview-container');
      commentsToWrite.forEach(comment => {
        let preview = document.createElement('div');
        preview.classList.add('wl-comment-preview');
        preview.style['margin-bottom'] = '10px';
        preview.innerText = comment;

        previewContainer.append(preview);
      })

      const startButton = modal.content.querySelector('button.wl-start');
      startButton.addEventListener('click', async (e) => {
        startButton.setAttribute('disabled', 'true');
        startButton.innerText = 'Dodawanie komentarzy do bazy danych...';

        await this._database.addCommentsToWrite(entryId, commentsToWrite);

        modal.modal.remove();

        this._worker.start();
      })
    });
  }

  createSettingsButton = (listNode) => {
    const logoutButton = listNode.querySelector('li.logout');
    
    let listsSettingsButton = document.createElement('li');
    listsSettingsButton.classList.add('wykop-lists-settings');
  
    let listsSettingsLink = document.createElement('a');
    listsSettingsLink.setAttribute('data-v-c965bb88', '');
    listsSettingsLink.innerText = 'Ustawienia list';
  
    listsSettingsButton.append(listsSettingsLink);
  
    logoutButton.parentNode.insertBefore(listsSettingsButton, logoutButton);

    listsSettingsButton.addEventListener('click', (e) => {
      this.openSettingsModal();
    })
  
    return listsSettingsButton;
  }

  createActionMenuItem = (menuNode) => {
    let closestSection = menuNode.closest('section');
    if (closestSection == null) {
      return;
    }

    if (closestSection?.__vue__?.$options?.propsData?.type !== 'entry') {
      return;
    }

    let entryId = closestSection?.__vue__?.$options?.propsData?.item?.id;

    if (entryId == null) {
      return;
    }

    let listItem = document.createElement('li');
    listItem.setAttribute('data-v-3791abaf', '');
    listItem.classList.add('icon');
    listItem.classList.add('icon-lists');
    listItem.innerHTML = `<span data-v-3791abaf>Zawołaj tutaj</span>`;

    listItem.addEventListener('click', () => {
      this.openAppEntryModal(entryId)
    })
  
    menuNode.appendChild(listItem);
  }

  _initSettingsButton = () => {
    if (this._settingsButton == null) {
      let logoutButton = document.querySelector('li.logout');
    
      if (logoutButton == null) {
        return
      }
    
      this._settingsButton = this.createSettingsButton(logoutButton.parentNode);
    }
  }
  
}

let wykopLists = new WykopLists();

const mutationObserver = new MutationObserver(mutationList => {
  mutationList.forEach(m => {
    m.addedNodes.forEach((node) => {
      if (node.querySelectorAll == null) {
        return;
      }
      
      if (wykopLists._settingsButton == null && node.querySelector('li.logout')) {
        wykopLists._settingsButton = wykopLists.createSettingsButton(node);
      }

      if (node.tagName.toLowerCase() == 'ul' && node.classList.contains('actions') && node.classList.contains('fade-enter')) {
        wykopLists.createActionMenuItem(node);
      }
    });
  });
});
mutationObserver.observe(document.body, {childList: true, subtree: true});