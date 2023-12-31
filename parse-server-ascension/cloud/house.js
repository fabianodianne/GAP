/*
    Functions that are not yet tested upon creating/updating:
    - GetHouseLeaderboard (NOT YET TESTED FOR MULTIPLE STUDENTS with different XP)
*/
Parse.Cloud.define("AddHouse", async(request) => {
    const House = Parse.Object.extend("House");
    const house = new House();
    const argument = request.params;
    
    var convertedImage = {base64: argument.HouseLogo};
    var parseFile = new Parse.File(argument.HouseLogoName, convertedImage);

    parseFile.save({ useMasterKey: true }).then(function(result) {
        var link = result.url();
        house.save({
            "HouseName" : argument.HouseName,
            "HouseLogo" : link,
            "HouseBannerIDPointer" : argument.HouseBannerIDPointer,
        }, { useMasterKey: true }).then(()=>{
            console.log("Successfully added House!");
        });
    });
});

Parse.Cloud.afterSave("House", async(request)=>{
    const house = request.object;
    const original = request.original;
    //If object is newly created
    if (!original){
        return house.save({
            "HouseBadgesIDEarned" : [],
            "HouseTrophiesIDUnlocked" : [],
            "HousePopulation" : 0,
            "HouseXP" : 0,
        });
    }
});

//Must specify id of House with name of "HouseID"
Parse.Cloud.define("EditHouse", async(request) => {
    const argument = request.params
    const dataParams = {
        "HouseID": argument.HouseID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetHouseData", dataParams);

    var list_of_attr = ["HouseName", "HouseBannerIDPointer", "HouseBadgesIDEarned", "HouseTrophiesIDUnlocked", "HousePopulation", "HouseXP",
    ];
    
    var list_of_arguments =[argument.HouseName, argument.HouseBannerIDPointer, argument.HouseBadgesIDEarned, argument.HouseTrophiesIDUnlocked, argument.HousePopulation, argument.HouseXP,
    ];

    for(let i = 0; i < list_of_attr.length; ++i){
        if(list_of_arguments[i] != null){
            res.set(list_of_attr[i], list_of_arguments[i]);
        }
    }

    if(argument.HouseLogo != null && argument.HouseLogoName != null){
        //Delete old image
        var imageToDelete = res.get("HouseLogo").replace('/myAppId','');
        var param = {"url" : imageToDelete};
        await Parse.Cloud.run("DeleteFile", param);

        var convertedImage = {base64: argument.HouseLogo};
        var parseFile = new Parse.File(argument.HouseLogoName, convertedImage);

        parseFile.save({ useMasterKey: true }).then(function(result) {
            var link = result.url();
            res.set("HouseLogo", link);
            res.save().then(()=>{
                console.log("Successfully Edited House");
            });
        });
    }
    else{
        res.save().then(()=>{
            console.log("Successfully Edited House");
        });
    }
});

//Must specify id of House with name of "HouseID"
Parse.Cloud.define("DeleteHouse", async(request) => {
    const argument = request.params
    const dataParams = {
        "HouseID": argument.HouseID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetHouseData", dataParams)

    if(res.get("HousePopulation") >= 1){
        return Promise.reject("House should have no members before deleting! Consider changing the house of the members.");
    }
    res.destroy().then(() => {
        console.log("Successfully Deleted House");
    });
});

//Must specify id of House with name of "HouseID"; Specify Type to 1 only if you need the query's result (object)
//Returns the data of a house or the query's result based on the value of Type
Parse.Cloud.define("GetHouseData", async(request) => {
    const House = Parse.Object.extend("House");
    const query = new Parse.Query(House);
    const argument = request.params;
    query.equalTo("objectId", argument.HouseID);
    const res = await query.first();
    if(argument.Type == 1){
        return res
    }

    //Pass HouseBadgesEarned Data
    var HouseBadgesEarned = [];
    var params;
    for(const RewardID of res.get("HouseBadgesIDEarned")){
        params = {"RewardID" : RewardID};
        let RewardData = JSON.parse(await Parse.Cloud.run("GetRewardData", params));
        HouseBadgesEarned.push(RewardData.RewardData);
    }
    res.set("HouseBadgesEarned", HouseBadgesEarned);

    //Pass HouseTrophiesUnlocked Data
    var HouseTrophiesUnlocked = [];
    for(const RewardID of res.get("HouseTrophiesIDUnlocked")){
        params = {"RewardID" : RewardID};
        let RewardData = JSON.parse(await Parse.Cloud.run("GetRewardData", params));
        HouseTrophiesUnlocked.push(RewardData.RewardData);
    }
    res.set("HouseTrophiesUnlocked", HouseTrophiesUnlocked);

    //Pass HouseBanner link
    params = {"CosmeticID" : res.get("HouseBannerIDPointer")};
    const banner = JSON.parse(await Parse.Cloud.run("GetCosmeticData", params));
    res.set("HouseBanner", banner.CosmeticImage);

    return JSON.stringify(res);
});

//Returns all houses
Parse.Cloud.define("GetHouses", async(_request) => {
    const House = Parse.Object.extend("House");
    const query = new Parse.Query(House);
    const res = await query.find();
    return JSON.stringify(res);
});

//ChangeHouseBanner
//Must specify id of House with name of "HouseID" and "BannerID"
Parse.Cloud.define("ChangeHouseBanner", async(request) => {
    const argument = request.params
    const dataParams = {
        "HouseID": argument.HouseID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetHouseData", dataParams)
    res.set("HouseBannerIDPointer",  argument.HouseBannerIDPointer);
    res.save().then(()=>{
        console.log("Successfully Changed House Banner");
    });
});

//Must specify id of House with name of "HouseID" and "XP"
//This will add/subtract the "ModifyXP" given
Parse.Cloud.define("ModifyHouseXP", async(request) => {
    const argument = request.params
    const dataParams = {
        "HouseID": argument.HouseID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetHouseData", dataParams)

    var xp = res.get("HouseXP");
    xp += argument.XP;
    res.set("HouseXP", xp);

    res.save().then(()=>{
        console.log("Successfully Added/Subtracted HouseXP");
    });
});

//Must specify id of House with name of "HouseID" and "StudentID"
Parse.Cloud.define("AddHouseMember", async(request) => {
    const Student = Parse.Object.extend("Student");
    const query0 = new Parse.Query(Student);
    const argument = request.params;

    //Set the HouseID of student to the given houseID 
    query0.equalTo("objectId", argument.StudentID);
    const res0 = await query0.first();
    res0.set("StudentHouseIDPointer", argument.HouseID);

    //Get House based on HouseID
    const dataParams = {
        "HouseID": argument.HouseID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetHouseData", dataParams)

    //And as well as the Banner of the student
    res0.set("BannerID", res.get("HouseBannerIDPointer"));
    res0.save();

    //Increment Population of House
    var population = res.get("HousePopulation");
    population += 1;
    res.set("HousePopulation", population);
    res.save().then(()=>{
        console.log("Successfully Added Member");
    });
});

//Must specify id of House with name of "HouseID" and "StudentID"
Parse.Cloud.define("DeleteHouseMember", async(request) => {
    const Student = Parse.Object.extend("Student");
    const query0 = new Parse.Query(Student);
    const argument = request.params;

    //Set the HouseID of student to null
    query0.equalTo("objectId", argument.StudentID);
    const res0 = await query0.first();

    if(res0.length == 0){
        return Promise.reject("This Student is not a member of this house");
    }

    res0.set("StudentHouseIDPointer", null);
    res0.save();

    const dataParams = {
        "HouseID": argument.HouseID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetHouseData", dataParams)

    //Decrement Population
    var population = res.get("HousePopulation");
    population -= 1;
    res.set("HousePopulation", population);
    res.save().then(()=>{
        console.log("Successfully Deleted Member");
    });
});

Parse.Cloud.define("GetHousesLeaderboard", async(_request) => {
    const House = Parse.Object.extend("House");
    const query = new Parse.Query(House);
    query.descending("HouseXP");
    const res = await query.find();
    
    //Add ranking
    let rank = 1;
    let lastXP = null;
    for(var house of res){
        let houseXP = house.get("HouseXP");
        if(lastXP === null){
            house.set("Ranking", rank);
            lastXP = houseXP;
            continue;
        }
        if(lastXP != houseXP){
            rank += 1;
        }
        house.set("Ranking", rank);
        lastXP = houseXP;
    }
    return JSON.stringify(res);
});

//Must specify id of House with name of "HouseID" and "Count" for max students
//Returns list of students sorted by xp and firstname, with limit of "Count"
Parse.Cloud.define("GetHouseStudentLeaderboard", async(request) => {
    const Student = Parse.Object.extend("Student");
    const query = new Parse.Query(Student);
    const argument = request.params;
    query.equalTo("StudentHouseIDPointer", argument.HouseID);
    query.addDescending("XP");
    query.addAscending("FirstName");
    if(argument.Count != null){
        query.limit = argument.Count;
    }
    const res = await query.find();

    //Add ranking
    let rank = 1;
    let lastXP = null;
    for(var student of res){
        let studentXP = student.get("XP");
        if(lastXP === null){
            student.set("Ranking", rank);
            lastXP = studentXP;
            continue;
        }
        if(lastXP != studentXP){
            rank += 1;
        }
        student.set("Ranking", rank);
        lastXP = studentXP;
    }

    return JSON.stringify(res);
});