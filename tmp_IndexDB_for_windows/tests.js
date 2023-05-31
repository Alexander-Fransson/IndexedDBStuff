/***************************************
* Adding a defaulet path with zip file *
***************************************/

getDBVersion(version => {
    const req = IDB.open(dbname, version+1);

    req.onerror = event => {
        console.log(event.target.error);
    }
    req.onupgradeneeded = event => {
        const db = event.target.result;
        if(!db.objectStoreNames.contains('path')) db.createObjectStore('path', {keyPath: 'name'});
    }
    req.onsuccess = event => {
        const db = event.target.result;

        fetch('img.zip')
        .then(data => data.blob())
        .then(blob => {
            const file = new File([blob], 'original.zip');

            db
            .transaction('path','readwrite')
            .objectStore('path')
            .put(file);
        })
        .then(() => {
            db.close();
        });
}
})

/**************
* Utils Tests *
**************/

let img = document.querySelector('#test_screenshot');
let bright = document.querySelector('#brightness');

document.addEventListener('keydown', event => {
    if (event.code === "Space") {
        console.log('space')
        const IDB = window.indexedDB || window.mozIndexedDb || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
        const dbname = 'nodearkDB';
        const openVget = IDB.open(dbname);

        openVget.onsuccess = event => {
            const db = event.target.result;
            const dbversion = db.version;

            db.close();

            const IDBopen = IDB.open(dbname, dbversion + 1);

            IDBopen.onsuccess = event => {
                const db = event.target.result;
                const getParams = db
                .transaction('state', 'readonly')
                .objectStore('state')
                .get('params')

                getParams.onsuccess = event => {
                    const idbParams = event.target.result;
                    if(idbParams){
                        db.close()
                        console.log(idbParams)
                    }
                }
            }
        }
        openVget.onerror = event => {
            db.close()
            console.log(event.target.error);
        }   
    }
})

document.querySelector('#screenshot').addEventListener('click', () => {
    takeScreenshot(false, 
        (imgStr) => {console.log(imgStr)},
        (error) => {console.log(error);}
    );
});

document.querySelector('#uid').addEventListener('click', () => {
    generateUniqueId(
        (m) => console.log(m),
        (e) => console.log(e)
    );
});

document.querySelector('#reload').addEventListener('click', () => {
    reboot(() => {console.log('success')}, (e) => {console.log(e)})
});

document.querySelector('#info').addEventListener('click', () => {
    getGeneralDeviceInfo((m) => {console.log(m)}, (e) => {console.log(e)})
});

document.querySelector('#connection').addEventListener('click', () => {
    getNetworkType((m) => {console.log(m)},(e) => {console.log(e)});
});

document.querySelector('#set_br').addEventListener('click', () => {
    setBrightness(bright.value, () => console.log('brighter?'), () => console.log('not brighter'));
});

document.querySelector('#ip').addEventListener('click', () => {
    getIp((m) => {console.log(m)},(e) => {console.log(e)});
});

/****************
* Storage Tests *
****************/

let path = document.querySelector('#path');
let folder = document.querySelector('#folder');
let file = document.querySelector('#file');
let fil_name = document.querySelector('#file_name');
let fil_typ = document.querySelector('#file_type');

document.querySelector('#create_btn').addEventListener('click', function() {
    createFolder(path.value, 
        function(){console.log('success');},
        function(m){console.log(m)}
    );
});

document.querySelector('#delete_btn').addEventListener('click', function(){
    deleteFolder(path.value,folder.value,
        function(){console.log('success in delete');},
        function(m){console.log(m);}
    );
});

document.querySelector('#add_file').addEventListener('click', function(){
    writeData(path.value, fil_name.value, file.value, 
        function() {console.log('added file')},
        function(e){console.log(e)}
    );
});

document.querySelector('#del_file').addEventListener('click', function(){
    deleteFile(path.value, fil_name.value, 
        function(){console.log('finished deleting file')}
    );
});

document.querySelector('#get_file_list').addEventListener('click', function(){
    listFiles(path.value,
        function(m){console.log(m)},
        function(e){console.log(e)}
    );
});

document.querySelector('#read_file').addEventListener('click', function(){
    readData(path.value, fil_name.value,
        function(m){console.log(m)},
        function(e){console.log(e)}
    );
});

//https://ecosystemtest.nodeark.com/dapi/v2/13327/asset/1758/media/original/download
document.querySelector('#download').addEventListener('click', function(){
    download(fil_name.value, fil_typ.value, path.value, 
        'IKP-c9fec03b38841e5e4b83f0a478f3cabf', 
        function(e){throw new Error(e)}, 
        function(m){console.log(m)}, 
        function(){console.log('finished with download')}
    );
});

document.querySelector('#existance_check').addEventListener('click', function(){
    exists(path.value, fil_name.value,
        function(m){console.log(m)},
        function(e){throw new Error(e)}
    );
});

document.querySelector('#check_mem').addEventListener('click', function(){
    getStorageInBytes(
        function(m){console.log(m)},
        function(e){throw new Error(e)}
    );
});

document.querySelector('#fire_signal').addEventListener('click', function(){
    interruptDownload(1,function(e){throw new Error(e)});
});

document.querySelector('#unzip').addEventListener('click', function(){
    unzip(path.value, fil_name.value,
        function(){console.log('success')},
        function(e){throw new Error(e)}
    );
});

document.querySelector('#rename').addEventListener('click', function(){
    rename(path.value, fil_name.value, folder.value, 
        function(){console.log(`renamed file`)},
        function(e){throw new Error(e)}
    );
});

document.querySelector('#create_zip').addEventListener('click', function(){
    const req = IDB.open(dbname);
    req.onsuccess = function(event){
        const db = event.target.result;
        const getfile = db
        .transaction('Path/path', 'readonly')
        .objectStore('Path/path')
        .get('pet_list.html')

        getfile.onsuccess = function(e){
            console.log(e.target.result);

            const zip = new JSZip();
            zip.file('pet_list.html',e.target.result)
            zip.generateAsync({type:"blob"}).then(function(content){
                console.log(content);
                const zipFile = new File([content], 'pet_list.zip', {type: content.type});

                const setfile = db
                .transaction('Path/path', 'readwrite')
                .objectStore('Path/path')
                .add(zipFile);

                setfile.onsuccess = function(){
                    console.log('success')
                }
            })

        }
    }
});

/*************
* Real tests *
*************/

document.querySelector('#getobjecturl').addEventListener('click', () => {
    getFileUrl(`documents/nodeark/assets/${fil_name.value}/download`, (s) => img.src = `${s}`);
});