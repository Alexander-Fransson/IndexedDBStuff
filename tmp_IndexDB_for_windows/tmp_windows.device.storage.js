const FAKE_ID = 71395;
const FAKE_KEY = '4c772c3ad732935c4ddc936ec770c38b';

const IDB = window.indexedDB || window.mozIndexedDb || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
const dbname = 'nodearkDB';
let abortController = new AbortController();

function getDBVersion(onsuccess){
    const req = IDB.open(dbname);

    req.onsuccess = event => {
        const db = event.target.result;
        const dbversion = db.version;

        db.close();
        onsuccess(dbversion)
    }
    req.onerror = event => console.log(event.target.error);
}

function openIDB(onsuccess, onfail){
    getDBVersion(dbversion => {
        const req = IDB.open(dbname, dbversion+1);

        req.onsuccess = event => {
            const db = event.target.result;
            onsuccess(db);
        }
        req.onerror = event => onfail(`Failed to open the IDB\n${event.target.error}`);
    });
}

function FileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result);
        }
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    })
}

function getMimeType(fileExtension) {
    switch (fileExtension) {
        case 'txt':
            return 'text/plain';
        case 'html':
            return 'text/html';
        case 'css':
            return 'text/css';
        case 'js':
            return 'application/javascript';
        case 'json':
            return 'application/json';
        case 'xml':
            return 'application/xml';
        case 'pdf':
            return 'application/pdf';
        case 'jpeg':
        case 'jpg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        case 'gif':
            return 'image/gif';
        case 'svg':
            return 'image/svg+xml';
        case 'mp3':
            return 'audio/mpeg';
        case 'mp4':
            return 'video/mp4';
        default:
            return 'application/octet-stream';
    }
}

//Puts the params in session storages and changes al file references into object urls
let getFileUrl = (path, onsuccess, playerElement) => {
    const urlList = path.includes('?') ? path.split('?') : [path,null];
    const queryParams = new URLSearchParams('?'+urlList.pop());
    const storeList = urlList.shift().split('/');
    const file = storeList.pop();
    const store = storeList.join('/');
    const Paramsfiles = [];

    const autoplay = () => {
        if (playerElement instanceof HTMLVideoElement) {
            playerElement.autoplay = true
            playerElement.muted = true
        }
    }

    const getObjectUrl = (file, store, onsuccess) => {
        openIDB(db => {
            if(!db.objectStoreNames.contains(store)){
                //Returning path for iframes
                db.close();
                onsuccess(path);
            }else{
                const object = db
                .transaction(store, 'readonly')
                .objectStore(store)
                .get(file);

                object.onerror = event => {
                    db.close();
                    console.log('FAILED TO CREATE AN OBJECT URL FOR PATH',path,event.target.error);
                }
                object.onsuccess = event => {
                    db.close();
                    onsuccess(URL.createObjectURL(event.target.result))
                }
            }
        });  
    }

    for(const entry of queryParams.entries()){
        if(entry[1].includes('%2F') || entry[1].includes('/')){
            Paramsfiles.push(entry);
        }
    }

    if(Paramsfiles.length){
        new Promise(filesChanged => {
            const TransformUrl = index => {
                if(index >= Paramsfiles.length) return filesChanged(`?${queryParams.toString()}`)
                
                const root = store.split('/');
                const relativePath = Paramsfiles[index][1].split('/');
                const currantFile = relativePath.pop();

                while(relativePath[0] === ".."){
                    root.pop();
                    relativePath.shift();
                }

                const currantStore = `${root.join('/')}/${relativePath.join('/')}`;

                new Promise(resolve => getObjectUrl(currantFile, currantStore, resolve))
                .then(objectUrl =>  {
                    queryParams.set(Paramsfiles[index][0], objectUrl);
                    TransformUrl(index + 1);
                })
            }
            TransformUrl(0);
        })
        .then(changedParams => {
            sessionStorage.setItem('params',changedParams);
            getObjectUrl(file, store, onsuccess);
            autoplay();
        });

    }else{
        sessionStorage.setItem('params',`?${queryParams.toString()}`);
        getObjectUrl(file, store, onsuccess);
        autoplay();
    }
}

//Increments the version of the IndexedDB triggering a versionchange transaction wherein a given object store and all its folder children are deleted.
let deleteFolder = (path, folder, onfinished, onfail) => {
    let storeName = `${path}/${folder}`;

    getDBVersion(dbversion => {
        dbversion += 1;
        const req = IDB.open(dbname, dbversion);
        
        if(folder === '' || folder === null || folder === undefined){
            storeName = path; 
        }

        req.onupgradeneeded = () => {
            const db = req.result;
            if(db.objectStoreNames.contains(storeName)){
                Object.values(db.objectStoreNames).filter(item => item.startsWith(storeName)).forEach(store => {
                    db.deleteObjectStore(store);
                })
            }
        }
        req.onsuccess = () => {
            req.result.close();
            onfinished();
        }
        req.onerror = event => {
            req.result.close();
            onfail(`Failure in deleting the folder.\n${event.target.error}`);
        }
    });
}

//Deletes an object in a given object store.
let deleteFile = (path, file, onfinished) => {
    openIDB(db => {
        if(!db.objectStoreNames.contains(path)){
            console.log(`Cannot find path "${path}".`);
            return;
        }
        const deleteReq = db
        .transaction(path, 'readwrite')
        .objectStore(path)
        .delete(file);
        
        deleteReq.onerror = event => {
            db.close();
            console.log(`Failed to delete file\n${event.target.error}`);
        }
        deleteReq.onsuccess = () => {
            db.close();
            onfinished();
        }
    });
}

//Lists the objects in a given object store.
let listFiles = (path, onsuccess, onfail) => {
    openIDB(db => {
        if(!db.objectStoreNames.contains(path)){
            onfail(`Cannot find path ${path}`);
            return;
        }
        const getallFiles = db
        .transaction(path, 'readonly')
        .objectStore(path)
        .getAll();
        
        getallFiles.onerror = event => {
            db.close();
            onfail(`Cannot get file names.\n${event.target.error}`);
        }
        getallFiles.onsuccess = event => {
            const listOfFileNames = event.target.result.map(file => file.name);
            db.close();
            onsuccess(listOfFileNames);
        }
    });
}

//Creates an object that can be read by the readData function or replaces one with the given name.
let writeData = (path, filename, data, onsuccess, onfail) => {
    openIDB(db => {
        if(!db.objectStoreNames.contains(path)){
            onfail(`Cannot find path ${path}`);
            return;
        }
        const newFile = new File([data], filename, {type: 'text/plain'});
        const postReq = db
        .transaction(path,'readwrite')
        .objectStore(path)
        .put(newFile);

        postReq.onerror = event => {
            db.close();
            onfail(event.target.Error);
        }
        postReq.onsuccess = () => {
            db.close();
            onsuccess();
        }
    });
}

//Creates clones of all object stores that match the path, giving them a diferent name and delates the original.
let rename = (path, name, newName, onsuccess, onfail) => {
    openIDB(db => {
        const matchingStores = Object.values(db.objectStoreNames).filter(store => {
            const affectedFolders = [...path.split('/'), name];
            return store.split('/').slice(0,affectedFolders.length).every((value, index) => value === affectedFolders[index]) && store.length >= `${path}/${name}`.length;
        });

        if(!db.objectStoreNames.contains(path)){
            db.close();
            onfail(`Could not find path ${path}`);
            return;
        }
        else if(matchingStores.length){
            //renmae object store
            db.close();
            const changeFunctions = [];

            matchingStores.forEach(store => {
                changeFunctions.push(() => {
                    return new Promise(resolve => {
                        getDBVersion(version => {
                            const req = IDB.open(dbname,version+1);
            
                            req.onupgradeneeded = event => {
                                const db = event.target.result;
                                const newStoreName = `${path}/${newName}`+ store.slice(`${path}/${name}`.length);
                                const newObjectStore = db.createObjectStore(newStoreName, {keyPath:'name'});
                                const oldStore = event.target.transaction.objectStore(store);
            
                                //Transferr all the contents to the new store.

                                oldStore.openCursor().onsuccess = event => {
                                    const cursor = event.target.result;
                                    if(cursor){
                                        oldStore.delete(cursor.value.name);
                                        newObjectStore.add(cursor.value);
                                        cursor.continue();
                                    }else{
                                        db.deleteObjectStore(store);
                                    }
                                }
                            }
                            req.onerror = event => {
                                req.result.close();
                                onfail(`FAILED TO RENAME ${path}/${name}\n${event.target.error}`);
                                resolve();
                            }
                            req.onsuccess = () => {
                                req.result.close();
                                resolve();
                            }
                        });
                    });
                });
            });

            const renameStores = index => {
                if(index >= matchingStores.length) onsuccess();
                else changeFunctions[index]().then(() => renameStores(index + 1));
            }
            renameStores(0);
            
        }else{
            //rename file
            const objectStore = db.transaction(path, 'readwrite').objectStore(path);
            const getFile = objectStore.get(name);

            getFile.onerror = event => {
                db.close();
                onfail(`Failed to get the file.\n${event.target.error}`)
            };
            getFile.onsuccess = event => {
                if(event.target.result !== undefined){
                    const fileData = event.target.result;
                    const newFile = new File([fileData], newName, {type: fileData.type})
                    const addFile = objectStore.add(newFile);

                    addFile.onerror = event => {
                        db.close();
                        onfail(`Failed to add file.\n${event.target.error}`);
                    }
                    addFile.onsuccess = () => {
                        const deleteOldFile = objectStore.delete(name);

                        deleteOldFile.onerror = event => {
                            db.close();
                            onfail("Failed to delete old file.\n"+event.target.result);
                        }
                        deleteOldFile.onsuccess = () => {
                            db.close();
                            onsuccess();
                        }
                    }   
                }else{
                    db.close();
                    onfail(`File ${name} does not exist in store ${path}`);
                }
            }
        }
    });
}

//Reads the data from the file object in IndexedDB with the given name.
let readData = (path, filename, onsuccess, onfail) => {
    openIDB(db => {
        if(!db.objectStoreNames.contains(path)){
            onfail(`Cannot find path ${path}`);
            return;
        }
        const readRequest = db
        .transaction(path, 'readonly')
        .objectStore(path)
        .get(filename);

        readRequest.onerror = event => {
            db.close();
            onfail(`Failed to get from object store.\n${event.target.error}`);
        }
        readRequest.onsuccess = event => {
            const filereader  = new FileReader();
            filereader.readAsText(event.target.result);
            filereader.onload = event => {
                db.close();
                onsuccess(event.target.result);
            }
        }
    });
}

//Unzips a target from the IndexedDB in the case that it is a zip file object and creates object stores for all directories and file objects for all the files.
//Also changes the references to the other files to base64 strings and makes the file look for search parameters in session storage.
let unzip = (path, target, onsuccess, onfail) => {
    openIDB(db => {
        if(!db.objectStoreNames.contains(path)){
            db.close();
            onfail(`Could not find path ${path}`);
            return;
        }
        const getZipFile = db
        .transaction(path, 'readonly')
        .objectStore(path)
        .get(target);

        getZipFile.onerror = event => {
            db.close();
            onfail(`Failed to get the zip file.\n${event.target.error}`);
        }
        getZipFile.onsuccess = event => {
            if(event.target.result){
                const file = event.target.result;
                const reader = new FileReader();
                
                reader.onload = event => {
                    const arrayBuffer = event.target.result; 
                    const zip = new JSZip();
                    let filePipes = [];
    
                    zip.loadAsync(arrayBuffer).then(data => {
                        data.forEach((_relativePath, zipEntry) => {
                            if(!zipEntry.dir){
                                zipEntry.async('arraybuffer')
                                .then(unzippedData => {
                                    return new Promise(resolveOuter => {
                                        const extension = zipEntry.name.split('.').pop();
                                        const mime = getMimeType(extension);
                                        const filePath = zipEntry.name.split('/');
                                        const fileName = filePath.pop();
                                        const fullPath = `${path}${filePath.length <= 0 ? "": filePath.length > 1 ? "/"+filePath.join('/') : "/"+filePath[0]}`;
                                        const blob = new Blob([unzippedData],{type: mime});
                                        const unzippedFile = new File([blob], fileName, {type: mime});
                                        
                                        FileToBase64(unzippedFile)
                                        .then(base64String => {
                                            filePipes.push({
                                                references: {
                                                    fileName: fileName,
                                                    url: base64String
                                                },
                                                urlChanger: index => {
                                                    return new Promise(resolve => {
                                                        const currantRef = filePipes[index].references;
                                                        const reader = new FileReader();
                                                        const file = unzippedFile;
            
                                                        reader.onload = event => {
                                                            let fileText = event.target.result;
            
                                                            //All urls are strings so I divide the file text and check if anything include the file name.
                                                            //I also replace the params with the params in the session storage.

                                                            if(fileText.includes('window.location.search')){
                                                                fileText = fileText.replaceAll('window.location.search','sessionStorage.getItem("params")');
                                                            }

                                                            let potentialURLs = fileText.split('"');
                                                            filePipes.forEach(item => {
                                                                potentialURLs = potentialURLs.map(string => {
                                                                    if(string.includes(item.references.fileName)) return item.references.url;
                                                                    else return string;
                                                                })
                                                            });

                                                            const updatedBlob = new Blob([potentialURLs.join('"')], {type: file.type});
                                                            const updatedFile = new File([updatedBlob], file.name, {type: file.type});

                                                            FileToBase64(updatedFile)
                                                            .then(base64String => {
                                                                filePipes[index].references = {...currantRef, file: updatedFile, url:base64String};
                                                                resolve();
                                                            })
                                                        }
                                                        reader.readAsText(file);
                                                    })
                                                },
                                                fileAdder: file => {
                                                    return new Promise(resolve => {
                                                        createFolder(fullPath, () => {
                                                            openIDB(db => {    
                                                                const addFile = db
                                                                .transaction(fullPath, 'readwrite')
                                                                .objectStore(fullPath)
                                                                .put(file);

                                                                addFile.onsuccess = () => {
                                                                    db.close();
                                                                    resolve();
                                                                }
                                                                addFile.onerror = event => {
                                                                    db.close();
                                                                    onfail(event.target.error);
                                                                    resolve();
                                                                }
                                                            });
                                                        },(error) => {
                                                            onfail(error);
                                                            resolve();
                                                        });
                                                    });
                                                }
                                            });

                                            resolveOuter();
                                        })
                                    })
                                })
                                .then(() => {
                                    if(filePipes.length === Object.keys(data.files).length -1){
                                        db.close();

                                        const htmlFiles = filePipes.filter(item => item.references.fileName.endsWith('.html'));
                                        filePipes = [...filePipes.filter(item => !item.references.fileName.endsWith('.html')), ...htmlFiles];

                                        const createStores = (index) => {
                                            if(index >= filePipes.length) onsuccess();
                                            else filePipes[index].fileAdder(filePipes[index].references.file).then(() => createStores(index + 1));
                                        }
                                        const renameUrls = (index) => {
                                            if(index >= filePipes.length) createStores(0);
                                            else filePipes[index].urlChanger(index).then(() => renameUrls(index + 1));
                                        }
                                        renameUrls(0);
                                    }
                                });
                            }
                        });
                    });
                }
                reader.readAsArrayBuffer(file);
            }else{
                db.close();
                onfail(`Failed to get the zip file ${target}`);
            }                
        }
    });
}

//Increments the version of the IndexedDB and creates a new object store in the version change transaction 
//with a name coresponding to the given path, for every folder contained in the path that does not already exist.
let createFolder = (path, onsuccess, onfail) => {
    getDBVersion(dbversion => {
        dbversion += 1;
        const req = IDB.open(dbname, dbversion);

        req.onupgradeneeded = function(event){
            const db = event.target.result;
            const foldersInPath = path.split('/');
            let folderPath = '';
    
            foldersInPath.forEach(element => {
                folderPath += element;
                if(!db.objectStoreNames.contains(folderPath)){
                    db.createObjectStore(folderPath, {keyPath: 'name'});
                }
                folderPath += '/';
            });
        }
        req.onerror = event => {
            req.result.close();
            onfail(`FAILED TO CREATE ${path}\n${event.target.error}`);
        }
        req.onsuccess = () => {
            req.result.close();
            onsuccess();
        }
    });
}

//Checks if a file exists in a given object store. It may have a detremental effect on preformance as it 
//has to open the IDB and the specified object store to check its contents and so it is asyncronus.
let exists = (path, name, onsuccess, onfail) => {
    const checkIfExists = () => openIDB(db => {

        if(!db.objectStoreNames.contains(path)){
            db.close();
            onsuccess(false);
            return;
        }else if(db.objectStoreNames.contains(`${path}/${name}`)){
            db.close();
            onsuccess(true);
            return;
        }

        const checkReq = db
        .transaction(path, 'readonly')
        .objectStore(path)
        .get(name);

        checkReq.onerror = event => {
            db.close();
            onfail(event.target.error);
        }
        checkReq.onsuccess = event => {
            if(event.target.result === undefined){
                db.close();
                onsuccess(false)
            }else{
                db.close();
                onsuccess(true);
            }
        }
    })

    // creat settings file to pass is Registered and all other files.
    if(path === 'documents/nodeark' && name === 'settings.json'){
        writeData(
            'documents/nodeark',
            'settings.json',
            JSON.stringify({
                apiPath: '',
                isRegistered: true,
                rand: FAKE_KEY,
                deviceId: FAKE_ID
            }),
            checkIfExists,
            error => console.log(error)
        );
    }else{
        checkIfExists();
    }
}

//Creates a path that may be used as the name of an object store. 
//No need to generate a local path as indexedDB does not require it.
let generateLocalPath = (assetId, onsuccess, onfail) => {
    onsuccess('documents/nodeark/assets/'+assetId);
}

//Gets the total and available storage capacity of the indexedDB in bytes.
let getStorageInBytes = (onsuccess, onfail) => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(storageEstimate => {
            onsuccess({
                free: JSON.stringify(storageEstimate.quota - storageEstimate.usage), 
                total: JSON.stringify(storageEstimate.quota)
            }); 
        });
    } else {
        onfail('No suport for storage API.');
    }
}

//Downloads a file via fetch and inerts it in the indexedDB. The progress is reported in the number of procentage units 
//that have already been downloaded although it may be inacurate as it relys on the files reporing their size. Further more 
//the download can be interupted through the interupt download function by invoking an impedded AbortController. 
//Also an optional Aut-Token can be passed in for authentication, although it may trigger the cors policy of most websites.
//url for testing https://www.adoptapet.com/public/apis/pet_list.html.
let download = (downloadUrl,fileType,targetPath,token,onfail,ondownload,onfinished) => {
    let headers = {'Content-Type':fileType};

    if(token != '' && token != null && token != undefined){
        headers = {...headers,'AuthToken':token} 
    }

    fetch(downloadUrl, {
        signal: abortController.signal,
        headers: headers
    })
    .then(res => {
        if (!res.ok) {
            onfail('Network response was not ok.');
        }

        const total = parseInt(res.headers.get('content-length'));
        const chunks = [];
        let loadedData = 0;

        const progressCallback = event => {
            loadedData = event.loaded;
            ondownload(parseInt((loadedData/total)*100));
        };
    
        const reader = res.body.getReader();
        return reader.read().then(function processResult(result) {
            if (result.done) {
                return new Blob(chunks);
            }
            chunks.push(result.value);
            progressCallback({ loaded: loadedData + result.value.length, total });
            return reader.read().then(processResult);
        });
    })
    .then(blob => {
        const fileName = 'original.' + fileType;
        const file = new File([blob], fileName, {type: fileType});
        openIDB(db => {
            if(!db.objectStoreNames.contains(targetPath)){
                onfail(`Could not find "${targetPath}".`);
                return;
            }
            const addReq = db
            .transaction(targetPath, 'readwrite')
            .objectStore(targetPath)
            .put(file);

            addReq.onerror = event => {
                db.close();
                onfail(`Failed to add the file.\n${event.target.error}`);
            }
            addReq.onsuccess = () => {
                db.close();
                onfinished();
            }
        });
    })
    .catch(error => onfail(`Error on fetch.\n${error}`));
}

//Aborts all running fetch requests through an imbedded AbortController.
//Unresponding url for testing: https://www.sample-videos.com/zip/10mb.zip
let interruptDownload = (ticketId, onfail) => {
    try {
        abortController.abort();
        abortController = new AbortController();   
    } catch (error) {
        onfail(`Failed to abort.\n${error}`);
    }
}
//As IndexedDB does not have a file structure and a root folder this function returns an empty string.
let rootFolder = () => {
    return "";
}