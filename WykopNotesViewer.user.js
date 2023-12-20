// ==UserScript==
// @name         WykopNotesViewer
// @namespace    wykopembedhelper
// @version      0.2
// @description  Skrypt pokazuje notatki zaraz obok jego nicku
// @author       devRJ45
// @match        https://wykop.pl/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wykop.pl
// @grant        none
// @run-at document-end
// ==/UserScript==

(function() {

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  let pathsWhereAllowToAddNote = ['', 'mikroblog', 'ludzie', 'wpis', 'link'];

  let usersNodeQueue = [];
  let queueInProcess = false;

  const style = document.createElement('style'); 
  style.innerHTML = `
  .erjot-note {
    color: var(--tuna);
    margin-left: 5px;
    font-size: 13px;
  };
  `;
  document.head.append(style);

  let database = {
    options: {
      updateAfterDays: 7,
      trimCharacter: '|',
      ...JSON.parse(localStorage.notesOptions || '{}')
    },
    notes: {
      ...JSON.parse(localStorage.notesCache || '{}')
    }
  };

  Object.keys(database.notes).forEach((key) => {
    if (database.notes[key].updatedAt != null) {
      database.notes[key].updatedAt = new Date(database.notes[key].updatedAt);
    }

    if (database.notes[key].tryRequestAfter != null) {
      database.notes[key].tryRequestAfter = new Date(database.notes[key].tryRequestAfter);
    }
  });

  const updateAterDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * database.options.updateAfterDays);

  const mutationObserver = new MutationObserver(mutationList => {
    let currentPath = document.location.pathname.split('/')[1];
    if (currentPath == null) {
      return;
    }

    currentPath = currentPath.toLocaleLowerCase();

    if (!pathsWhereAllowToAddNote.includes(currentPath)) {
      return;
    }

    mutationList.forEach(m => {
      m.addedNodes.forEach((node) => {
        if (node.querySelectorAll == null) {
          return;
        }

        if (node.querySelector('section.user-note')) {
          hookUserInfoTextarea(node.querySelector('section.user-note'));
        }

        if (node.querySelectorAll('div.right') == null) {
          return;
        }

        [...node.querySelectorAll('div.right')].forEach( n => {
          [...n.querySelectorAll('a.username>span')].forEach( u => {
            addUserNodeToQueue(u);
          });
        });
      });
    });
  });
  mutationObserver.observe(document, {childList: true, subtree: true});

  function hookUserInfoTextarea (node) {
    if (node.__vue__ == null) {
      return;
    }

    let username = node.__vue__?.$options?.propsData?.username;
    let textarea = node.querySelector('textarea');

    if (username == null || textarea == null) {
      return;
    }

    const originalUpdateFunction = node.__vue__.updateDescription;
    node.__vue__.updateDescription = () => {
      originalUpdateFunction();
      sleep(50).then(() => {
        getUserNote(username, true).then(() => {
          updateDOMNoteByUsername(username);
        })
      })
    };
  }

  function getTrimmedNote (note) {
    let characterPosition = note.indexOf(database.options.trimCharacter);

    if (characterPosition > 0) {
      return note.substring(0, characterPosition);
    }

    return note;
  }

  function updateDOMNoteByUsername (username) {
    [...document.querySelectorAll('.right')].map(n => n.querySelector('a.username>span')).filter(n => n != null && n.innerText == username).forEach(async (usernameNode) => {
      let sectionNode = usernameNode.closest('section');
      
      if (sectionNode == null) {
          return;
      }
  
      let noteData = await getUserNote(username);
  
      let noteElement = sectionNode.querySelector('.erjot-note');

      let trimmedNote = getTrimmedNote(noteData.note);
  
      if (noteElement != null) {
          if (noteData.note.length == 0) {
              noteElement.remove();
              return;
          }
  
          noteElement.innerText = `| ${trimmedNote}`;
          return;
      }
  
      noteElement = createNoteElement(trimmedNote);
      usernameNode.parentNode.insertBefore(noteElement, usernameNode.nextSibling);
    });
  }

  function saveCacheNotesToStorage () {
    localStorage.notesCache = JSON.stringify(database.notes);
  }

  function addNoteToCache (username, note, apiProblem = false) {
    database.notes[username] = {
      note,
      updatedAt: new Date(),
    };

    if (apiProblem) {
      database.note[username].tryRequestAfter = new Date(Date.now() + 1000 * 60 * 60);
    }

    saveCacheNotesToStorage();

    return database.notes[username];
  }

  async function requestNoteFromApi (username) {
    try {
      let response = await fetch(`https://wykop.pl/api/v3/notes/${username}`, {
        "headers": {
          "accept": "application/json",
          "authorization": `Bearer ` + localStorage.token
        },
        "method": "GET",
        "credentials": "include"
      });

      let jsonData = await response.json();

      if (jsonData.data == null) {
        return null;
      }

      return jsonData.data;
    } catch (e) {
      return null;
    }
  }

  async function getUserNote (username, forceFromApi = false) {
    if (database.notes[username] == null || database.notes[username]?.updatedAt < updateAterDate || database.notes[username]?.tryRequestAfter < new Date() || forceFromApi) {
      let apiData = await requestNoteFromApi(username);
      if (apiData == null) {
        addNoteToCache(username, '', true);
      } else {
        addNoteToCache(apiData.username, apiData.content);
      }
    }

    return database.notes[username];
  }

  function getUserInfo (usernode) {
    let sectionNode = usernode.closest('section');

    if (sectionNode == null) {
      return;
    }

    let author = sectionNode?.__vue__?.$options?.propsData?.item?.author;

    if (author == null) {
      return null;
    }

    return {
      usernameNode: usernode,
      sectionNode,
      haveNote: author.note === true,
      username: author.username
    }
  }

  function addUserNodeToQueue (node) {
    let userInfo = getUserInfo(node);

    if (userInfo == null) {
      return;
    }

    if (!userInfo.haveNote) {
      return;
    }

    usersNodeQueue.push(userInfo);

    if (queueInProcess) {
      return;
    }

    addNotesForUsersInQueue();
  }

  function createNoteElement (note) {
    let noteSpan = document.createElement('span');
    noteSpan.className = 'erjot-note';
    noteSpan.innerText = `| ${note}`;

    return noteSpan;
  }

  async function addNotesForUsersInQueue () {
    queueInProcess = true;

    if (usersNodeQueue.length <= 0) {
      queueInProcess = false;
      return;
    }

    let userInfo = usersNodeQueue.shift();

    if (userInfo.sectionNode.querySelector('.erjot-note') == null) {
      let noteData = await getUserNote(userInfo.username);

      if (noteData.note.length !== 0) {
        let usernameNode = userInfo.usernameNode.closest('a');
        let trimmedNote = getTrimmedNote(noteData.note)

        let noteSpan = createNoteElement(trimmedNote);

        usernameNode.parentNode.insertBefore(noteSpan, usernameNode.nextSibling);
      }
    }
    addNotesForUsersInQueue();
  }
})();