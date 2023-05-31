// 1) Olika browsers har olika apier för att kontackta indexedDB så det är best att använda alla.
// 2) Försöker öppna en databas med namnet TestDB och versionen 1. Om den inte hittar en redan skapad skapar den en ny.
// 3) Körs när en databas skapas eller ändrar version, lägger up shemat.
// 4) Skapar indexar som är identifierare som indexedDB kan söka på.
// 5) Transaktioner i indexedDB kopplar ihop databas operationer som ska köras samtidigt och ser till att inga modifikationer sker om inte allt lyckas
// 6) För att sätta saker i den locala databasen.
// 7) Man kan sätta in o-indexad data men den kommer inte kunna sökas på.
// 8) För att hitta saker ur den locala databasen.
// I Chrome can man se sin databas i Inspect -> Application -> Storage -> IndexedDB.

// 1)
const IndexedDB = window.indexedDB || window.mozIndexedDb || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;

// 2)
const request = IndexedDB.open("TestDB", 1);

request.onerror = function (event) {
    console.log("An error has ocurred on indexDB\n"+event);
}

// 3) 
request.onupgradeneeded = function () {
    const store = request.result.createObjectStore("cars", {keyPath: "id"});
    // 4)
    store.createIndex("cars_colour", ["colour"], {unique: false});
    store.createIndex("colour_and_make", ["colour","make"], {unique:false});
}

request.onsuccess = function () {
    // 5)
    const transaction = request.result.transaction("cars", "readwrite");
    const store = transaction.objectStore("cars");
    const colourIndex = store.index("cars_colour");
    const colourAndMakeIndex = store.index("colour_and_make");

    const cars = [
        {id: 1, colour: "brown", make:"Hyunday"},
        {id: 2, colour: "green", make:"Toyota"},
        {id: 3, colour: "brown", make:"Ferari"},
        {id: 4, colour: "baishe", make:"Hyunday"},
    ];

    cars.forEach(function (car) {
        // 6)
        store.put({
            id: car.id, 
            colour: car.colour,
            make: car.make,
            condition: "new" // 7)
        });
    });

    // 8)
    const queryById = store.get(4);
    const queryByColour = colourIndex.getAll(["brown"]);
    const queryByColourAndMake = colourAndMakeIndex.getAll(["baishe","Hyunday"]);

    queryById.onsuccess = function () {
        console.log('has Id 4', queryById.result);
    }

    queryByColour.onsuccess = function () {
        console.log('has colour brown', queryByColour);
    }

    queryByColourAndMake.onsuccess = function () {
        console.log('has colour baish and is a hyunday', queryByColourAndMake);
    }

    transaction.oncomplete = function () {
        this.db.close();
    }
}