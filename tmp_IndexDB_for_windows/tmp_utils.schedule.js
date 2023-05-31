//This is propabley not especialy important fo the screen saver but I assume that the version would be 1.0.0
let getAppVersion = (onsuccess, onfail) => {
    try {
        onsuccess('1.0.0'); 
    } catch (error) {
        onfail(error)
    }
}

//Gets the client Ip.
let getIp = (onsuccess, onfail) => {
    try {
        onsuccess(window.location.hostname);
    } catch (error) {
        onfail(error);
    } 
}

//Translates keycodes to the string it represents. Maybe a bit execive?
let inputDictionary = (keyCode) => {
    switch (keyCode) {
        case 8:
          return "Backspace";
        case 9:
          return "Tab";
        case 13:
          return "Enter";
        case 16:
          return "Shift";
        case 17:
          return "Ctrl";
        case 18:
          return "Alt";
        case 19:
          return "Pause/Break";
        case 20:
          return "Caps Lock";
        case 27:
          return "Esc";
        case 32:
          return "Space";
        case 33:
          return "Page Up";
        case 34:
          return "Page Down";
        case 35:
          return "End";
        case 36:
          return "Home";
        case 37:
          return "Left Arrow";
        case 38:
          return "Up Arrow";
        case 39:
          return "Right Arrow";
        case 40:
          return "Down Arrow";
        case 45:
          return "Insert";
        case 46:
          return "Delete";
        case 48:
          return "0";
        case 49:
          return "1";
        case 50:
          return "2";
        case 51:
          return "3";
        case 52:
          return "4";
        case 53:
          return "5";
        case 54:
          return "6";
        case 55:
          return "7";
        case 56:
          return "8";
        case 57:
          return "9";
        case 65:
          return "A";
        case 66:
          return "B";
        case 67:
          return "C";
        case 68:
          return "D";
        case 69:
          return "E";
        case 70:
          return "F";
        case 71:
          return "G";
        case 72:
          return "H";
        case 73:
          return "I";
        case 74:
          return "J";
        case 75:
          return "K";
        case 76:
          return "L";
        case 77:
          return "M";
        case 78:
          return "N";
        case 79:
          return "O";
        case 80:
          return "P";
        case 81:
          return "Q";
        case 82:
          return "R";
        case 83:
          return "S";
        case 84:
          return "T";
        case 85:
          return "U";
        case 86:
          return "V";
        case 87:
          return "W";
        case 88:
          return "X";
        case 89:
          return "Y";
        case 90:
          return "Z";
        case 91:
          return "Left Window Key";
        case 92:
          return "Right Window Key";
        case 93:
          return "Select Key";
        case 96:
          return "Numpad 0";
        case 97:
          return "Numpad 1";
        case 98:
          return "Numpad 2";
        case 99:
          return "Numpad 3";
        case 100:
          return "Numpad 4";
        case 101:
          return "Numpad 5";
        case 102:
          return "Numpad 6";
        case 103:
          return "Numpad 7";
        case 104:
          return "Numpad 8";
    }    
}

//Generate a random number and store it in the indexedDB unless it does not already exist.
let generateUniqueId = (onsuccess, onfail) => {
    const dbname = 'nodearkDB';
    const req = indexedDB.open(dbname);

    req.onerror = event => onfail(`Failed to open indexedDB.\n${event.target.error}`);    
    req.onsuccess = event => {
        const db = event.target.result;

        try {
            const getUniqueId = db
            .transaction('state', 'readonly')
            .objectStore('state')
            .get('uniqueId');

            getUniqueId.onsuccess = event => {
                onsuccess(event.target.result.value);
                db.close();
            }
        } catch (error) {
            const dbVersion = db.version;
            const newUniqueID = Math.round(Math.random() * 1000000000000000);

            db.close();

            const newDBV = indexedDB.open(dbname, dbVersion + 1);
            newDBV.onerror = event => onfail(`Failed to update object store.\n${event.target.error}`);
            newDBV.onupgradeneeded = event => {
                const newDB = event.target.result;

                const objectStore = newDB.createObjectStore('state', {keyPath: 'state'});
                objectStore.add({state: 'uniqueId', value: newUniqueID.toString()});
            
            }
            newDBV.onsuccess = event => {
                onsuccess(newUniqueID.toString());
                event.target.result.close();
            }   
        }
    }
}

let reboot = (onsuccess, onfail) => {
    try {
        onsuccess();
        window.location.reload();   
    } catch (error) {
        onfail('Failed to reload the window');
    }
}

let getGeneralDeviceInfo = (onsuccess, onfail) => {
    try {
        onsuccess({
            model: 'ACCESS_DENIED',
            hardwareVersion: 'ACCESS_DENIED', 
            sdkVersion: 'ACCESS_DENIED',
            firmwareVersion: 'No access from browser sandbox',
            os: navigator.userAgent
        });
    } catch (error) {
        onfail(error)
    }
}

//Makes an edjucated guess on network type based on navigator.
let getNetworkType = (onsuccess, onfail) => {
    try {
        if(navigator.connection){
            console.log('Warning! Method of inquery is unreliable!');
            onsuccess(navigator.connection.effectiveType === 'ethernet'? 'WIRED':'WIFI' );
        }else{
            throw new Error('Navigator not supported.');
        }
    } catch (error) {
        onfail(error)
    }
}

let deviceType = () => {
    return "BROWSER";
}

//Does not seam to affect everything f.ex the background colour of the body. Brightness is a precentage so 1 or  100% is normal.
let setBrightness = (brightness, onsuccess, onfail) => {
    try {
        if ('CSS' in window && CSS.supports('filter', 'brightness(100%)')) {
            document.body.style.filter = `brightness(${brightness})`;
            document.body.style.backgroundColor = `rgba(0, 0, 0, ${1 - brightness})`;
            onsuccess();
        }else{
            throw new Error('Browser does not support filters and so cannot set brightness.')
        }
    } catch (error) {
        console.log(error);
        onfail();
    }
}

/***************************************************************************
* Below are obligatory but seamingly unnececary functions that do nothing. *
***************************************************************************/

//Cannot get mac-address from browser level as the mac adress is a low level identifier that is outside 
//the security sandbox of the browser that prevents it from accessing system level or hardware information.
let getMac = (onsuccess, onfail) => {
    onfail('Error: Cannot access Mac adress from the browser');
}

let upgradeSoftware = (onsuccess, onfail) => {
    onfail('Error: Cannot upgrade software as the command cannot be executed from the browser! Please upgrade manually (=|');
}

//Takes a screenshot by using navigator to tap into the screen stream and capturing an instance of it as a base64 string.
let takeScreenshot = async (highres, onsuccess, onfail) => {
  async function captureTabScreenshot() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const video = document.createElement('video');
    video.setAttribute('width', width);
    video.setAttribute('height', height);
  
    const stream = await window.navigator.mediaDevices.getUserMedia({
      video: {
        mediaSource: 'window',
        width,
        height
      }
    });
  
    video.srcObject = stream;
  
    await new Promise(resolve => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });
  
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, width, height);
    const base64Image = canvas.toDataURL();
    video.srcObject = null;
    stream.getTracks().forEach(track => track.stop());
  
    return base64Image;
  }
  
  captureTabScreenshot().then(base64Image => {
    onsuccess(base64Image);
  }).catch(error => {
    onfail(error);
  });
}

let setScreenRotation = (rotation, onsuccess, onfail) => {
    try {
        console.log('Unable to set screen roation from brwoser.');
        onsuccess();
    } catch (error) {
        onfail(error);
    }
}

//Even though I was told that this one was unnececary it feels important so if there is any problem I could always save urls in the IDB
let setInstallUrl = (url, onsuccess, onfail) => {
    try {
        console.log('No install url on browser so this function does nothing.');
        onsuccess();
    } catch (error) {
        onfail(error);
    }
}


//Will propably return an error becouse no url is set. 
let validateInstallUrl = (url) => {
    console.log('No url set so expect an error!');
    return fetch(`${url.href}`);
}

//Nothing equivalent in the browser to my knoledge.
let getInstallPath = (onsuccess, onfail) => {
    onfail('There are no install path on browsers');
}

//No remote needed for the screen saver or the browser.
let registerInputDevice = (onsuccess, onfail) => {
    console.log('The input device is the keyboard if anything.');
    try {
        onsuccess();    
    } catch (error) {
        onfail(error);
    }
}
