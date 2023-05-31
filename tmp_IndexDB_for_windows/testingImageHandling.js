const input = document.querySelector('#inputFile');
const DBOpenRequest = window.indexedDB.open('ImageDB', 3);
let db;

DBOpenRequest.onerror = function(){
    throw new Error('Failed to open the IndexedDB');
}

DBOpenRequest.onsuccess = function(){
    console.log('IndexedDB opened successfully');
    db = DBOpenRequest.result;
    createBackgroundOptions();
}

DBOpenRequest.onupgradeneeded = function(e) {
    db = e.target.result;

    db.onerror = function(){
        throw new Error('Failed to get e.target.result');
    }

    const objectStore = db.createObjectStore('ImageDB', {keyPath: 'id', autoIncrement: true});
    objectStore.createIndex('date', 'date', {unique: false});
    objectStore.createIndex('displayed','displayed', {unique: false});

    console.log('Object store created')
}

document.querySelector('#image_submit_form').addEventListener('submit', function(e){
    e.preventDefault();

    if(input.value === null){
        throw new Error('No Input given')
    }
    console.log(input.files[0].name);

    const newItem = { imageName: input.files[0].name, date: new Date(), file: input.files[0], displayed: 0};
    const transaction = db.transaction(['ImageDB'], 'readwrite');

    transaction.onerror = function(){
        throw new Error('Transaction failed in create item');
    }
    const objectStore = transaction.objectStore('ImageDB');
    const objectStoreRequers = objectStore.add(newItem);
    
    objectStoreRequers.onsuccess = function(){
        input.value = null;
    }
    transaction.oncomplete = createBackgroundOptions();
});

function createBackgroundOptions(){
    
    document.querySelectorAll('button').forEach(function(button) {
        button.remove();
        button = null;
    })
    const transaction = db.transaction(['ImageDB'], 'readonly');
    const objectStore = transaction.objectStore('ImageDB');
    const alternativesIndex = objectStore.index('displayed').getAll(0);
    const currentlyDisplayed = objectStore.index('displayed').get(1);

    currentlyDisplayed.onsuccess = function(){
        if(typeof currentlyDisplayed.result !== "undefined"){
            document.body.style.backgroundImage = `url(${URL.createObjectURL(currentlyDisplayed.result.file)})`;
        }
    }
    alternativesIndex.onsuccess = function(){

        alternativesIndex.result.forEach(function(option){
            const button = document.createElement("button");
            button.id = option.imageName;
            button.innerText = option.imageName;
            button.addEventListener('click', function(e){
                e.currentTarget.remove();
                addImageToBackground(option.id);
                e.currentTarget = null;
            });
            document.body.appendChild(button);            
        });
    }
}
 

function addImageToBackground(Id){

    const transaction = db.transaction(['ImageDB'], 'readwrite');
    const objectStore = transaction.objectStore('ImageDB');
    const req = objectStore.get(Id);

    req.onerror = function(){
        throw new Error('Error on image aquisition');
    }

    req.onsuccess = function(e){

        const currentBackground = objectStore.index('displayed').get(1);

        currentBackground.onsuccess = function(event) {

            if(typeof event.target.result !== "undefined"){
                const unshownImage = event.target.result;

                objectStore.put({...unshownImage, displayed: 0}); 
                
                const button = document.createElement("button");
                button.id = unshownImage.imageName;
                button.innerText = unshownImage.imageName;
                button.addEventListener('click', function(e){
                    e.currentTarget.remove();
                    addImageToBackground(unshownImage.id); 
                    e.currentTarget = null;
                });
                document.body.appendChild(button); 
            }
        }

        const newlyDisplayedImage = e.target.result;
        objectStore.put({...newlyDisplayedImage, displayed: 1})

        if(newlyDisplayedImage.file.type.includes('image')){
            document.body.style.backgroundImage = `url(${URL.createObjectURL(newlyDisplayedImage.file)})`;
        }
        else if (newlyDisplayedImage.file.type.includes('video')){

            //document.querySelector('video').remove();

            const videoContainer = document.createElement('video');
            const videoSource = document.createElement('source');
            videoSource.src = URL.createObjectURL(newlyDisplayedImage.file);
            videoContainer.autoplay = true;
            videoContainer.autofocus = true;
            videoContainer.appendChild(videoSource)
            document.body.appendChild(videoContainer);
        }
        else if (newlyDisplayedImage.file.type.includes('text')){

            const filereader  = new FileReader();
            filereader.readAsText(newlyDisplayedImage.file);

            filereader.onload = function () {
                alert(filereader.result);
            }
        }
    }
}