/*
    Functions that needs further testing:
    - GetStudentQuests
*/
var Global = require('./global');

Parse.Cloud.define("AddStudent", async(request) => {
    const Student = Parse.Object.extend("Student");
    const student = new Student();
    const argument = request.params;
    var param = {"YearLevel" : argument.YearLevel}
    const StatusTitleIDPointer = await Parse.Cloud.run("AssignStatusTitle", param);
    student.save({
        "FirstName" : argument.FirstName,
        "MiddleName" : argument.MiddleName,
        "LastName" : argument.LastName,
        "Email" : argument.Email,
        "ContactNumber" : argument.ContactNumber,
        "UserName" : argument.UserName,
        "Address" : argument.Address,
        "SchoolID" : argument.SchoolID,
        "YearLevel" : argument.YearLevel,
        "StudentUnitIDPointer" : argument.StudentUnitIDPointer,
        "StudentDegreeIDPointer" : argument.StudentDegreeIDPointer,
        "StudentCoursesIDPointer" : argument.StudentCoursesIDPointer,
        "StudentStatusTitleIDPointer" : StatusTitleIDPointer,
    }).then(async (res)=>{
        var user = request.user;
        user.set("AccountID", res.id);
        user.set("AccountType", "Student");
        user.save(null,{ useMasterKey: true });
        //Parse.Object.saveAll([user], { useMasterKey: true });
        console.log("Successfully added Student!");
    });
});

Parse.Cloud.afterSave("Student", async(request)=>{
    const student = request.object;
    const original = request.original;
    //If object is newly created
    if (!original){
        //Run SearchAscensionTitleFromXp
        var params = {"XpInput" : 0};
        var xptitle = JSON.parse(await Parse.Cloud.run("SearchAscensionTitleFromXp", params));
        var defaultCosmetics = JSON.parse(await Parse.Cloud.run("GetGlobal"));
        return student.save({
            "RegisterDate" : Global.getDateToday(),
            "XP" : 0,
            "AscensionPoints" : 0,
            "BadgesIDEarned" : [],
            "TrophiesIDUnlocked" : [],
            "ChosenTrophies" : [],
            "AvatarsIDUnlocked" : [defaultCosmetics.DefaultAvatarID],
            "FrameIDUnlocked" : [defaultCosmetics.DefaultFrameID],
            "BannerID" : "", //will be set to Banner of house upon assigning house
            "CoverPhotoIDUnlocked" : [defaultCosmetics.DefaultCoverPhotoID],
            "AscensionTitle" : xptitle.AscensionName,
            "StudentHouseIDPointer" : "",
            "EquippedCosmetics" : [defaultCosmetics.DefaultAvatarID, defaultCosmetics.DefaultFrameID, defaultCosmetics.DefaultCoverPhotoID], //set to default id [Avatar, Frame, CoverPhoto]
            "StudentDailyQuestsID" : [],
            "StudentWeeklyQuestsID" : [],
            "StudentLastLogin" : {"Day" : "", "Week" : ""}, // This is currently updated in the studentquestpage inorder to know when will the Quests reset.
            
        }).then(async(res)=>{
            //Run assign house
            params = {"StudentID" : res.id,};
            await Parse.Cloud.run("AssignHouse", params);
        });
        
    }
});

//Must specify id of student with name of "StudentID" then the attribute name along with the new value
Parse.Cloud.define("EditStudent", async(request) =>{
    const argument = request.params;
    const dataParams = {
        "StudentID": argument.StudentID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetStudentData", dataParams)
    
    var list_of_attr = ["FirstName", "MiddleName", "LastName", "Email", "ContactNumber", 
                        "RegisterDate", "UserName", "Address", "SchoolID",
                        "YearLevel", "StudentUnitIDPointer", "StudentDegreeIDPointer", "StudentCoursesIDPointer",
                        "XP", "AscensionPoints", "BadgesIDEarned", "TrophiesIDUnlocked", "ChosenTrophies",
                        "AvatarsIDUnlocked", "FrameIDUnlocked", "BannerID", "CoverPhotoIDUnlocked","AscensionTitle",
                        "StudentHouseIDPointer", "EquippedCosmetics", "StudentDailyQuestsID", "StudentWeeklyQuestsID",
                        "StudentLastLogin",
    ];
    var list_of_arguments = [argument.FirstName, argument.MiddleName, argument.LastName, argument.Email, argument.ContactNumber,
                            argument.RegisterDate, argument.UserName, argument.Address, argument.SchoolID,
                            argument.YearLevel, argument.StudentUnitIDPointer, argument.StudentDegreeIDPointer, argument.StudentCoursesIDPointer,
                            argument.XP, argument.AscensionPoints, argument.BadgesIDEarned, argument.TrophiesIDUnlocked, argument.ChosenTrophies,
                            argument.AvatarsIDUnlocked, argument.FrameIDUnlocked, argument.BannerID, argument.CoverPhotoIDUnlocked, argument.AscensionTitle,
                            argument.StudentHouseIDPointer, argument.EquippedCosmetics, argument.StudentDailyQuestsID, argument.StudentWeeklyQuestsID,
                            argument.StudentLastLogin,
    ];

    for(let i = 0; i < list_of_attr.length; ++i){
        if(list_of_arguments[i] != null){
            res.set(list_of_attr[i], list_of_arguments[i]);
        }
    }

    var param = {"YearLevel" : argument.YearLevel}
    const StatusTitleIDPointer = await Parse.Cloud.run("AssignStatusTitle", param);
    res.set("StudentStatusTitleIDPointer", StatusTitleIDPointer)
    
    res.save().then(()=>{
        console.log("Successfully Edited Student");
    });
});

//Must specify id of student with name of "StudentID"
Parse.Cloud.define("DeleteStudent", async(request) =>{
    const argument = request.params;
    const dataParams = {
        "StudentID": argument.StudentID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetStudentData", dataParams)

    var params = {
        "HouseID" : res.get("StudentHouseIDPointer"),
        "StudentID" : res.id,
    }
    await Parse.Cloud.run("DeleteHouseMember", params);

    res.destroy().then(()=>{
        console.log("Successfully Deleted Student");
    });
});

/* Must specify id of student with name of "StudentID"
    BadgesIDEarned will have BadgesEarned containing the data of each badges
    ChosenTrophies will have ChosenTrophiesData
    Same as TrophiesIDUnlocked, AvatarsIDUnlocked, etc.. 
    ---New: Stecify Type to 1 only if you need the query's result (object)---
    Returns the data of a student or the query's result based on the value of Type    
*/
Parse.Cloud.define("GetStudentData", async(request) => {
    const Student = Parse.Object.extend("Student");
    const query = new Parse.Query(Student);
    const argument = request.params;
    query.equalTo("objectId", argument.StudentID);
    const res = await query.first();

    if(argument.Type == 1){
        return res
    }

    var params;
    //Pass Unit Data
    params = {"UnitID" : res.get("StudentUnitIDPointer")};
    res.set("StudentUnit", JSON.parse(await Parse.Cloud.run("GetUnitData", params)));

    //Pass Degree Data
    params = {"DegreeID" : res.get("StudentDegreeIDPointer")};
    res.set("StudentDegree", JSON.parse(await Parse.Cloud.run("GetDegreeData", params)));

    //Pass Course Data(NOT SURE IF NEEDED)
    var CoursesData = [];
    for(const CourseID of res.get("StudentCoursesIDPointer")){
        params = {"CourseID" : CourseID}; 
        CoursesData.push(JSON.parse(await Parse.Cloud.run("GetCourseData", params)));
    }
    res.set("StudentCourses", CoursesData);

    //Pass StatusTitleData
    params = {"StatusTitleID" : res.get("StudentStatusTitleIDPointer")};
    res.set("StatusTitleData", JSON.parse(await Parse.Cloud.run("GetStatusTitleData", params)));

    //Pass House Data
    params = {"HouseID" : res.get("StudentHouseIDPointer")};
    res.set("StudentHouse", JSON.parse(await Parse.Cloud.run("GetHouseData", params)));

    //Pass BadgesEarned Data
    var BadgesEarned = [];
    for(const RewardID of res.get("BadgesIDEarned")){
        params = {"RewardID" : RewardID};
        let RewardData = JSON.parse(await Parse.Cloud.run("GetRewardData", params));
        BadgesEarned.push(RewardData.RewardData);
    }
    res.set("BadgesEarned", BadgesEarned);

    //Pass TrophiesUnlocked Data
    var TrophiesUnlocked = [];
    for(const RewardID of res.get("TrophiesIDUnlocked")){
        params = {"RewardID" : RewardID};
        let RewardData = JSON.parse(await Parse.Cloud.run("GetRewardData", params));
        TrophiesUnlocked.push(RewardData.RewardData);
    }
    res.set("TrophiesUnlocked", TrophiesUnlocked);

    //Pass ChosenTrophies Data
    var ChosenTrophiesData = [];
    for(const RewardID of res.get("ChosenTrophies")){
        params = {"RewardID" : RewardID};
        let RewardData = JSON.parse(await Parse.Cloud.run("GetRewardData", params));
        ChosenTrophiesData.push(RewardData.RewardData);
    }
    res.set("ChosenTrophiesData", ChosenTrophiesData);

    //Pass CosmeticsUnlocked Data
    var cosmeticArrNames = ["AvatarsIDUnlocked", "FrameIDUnlocked", "CoverPhotoIDUnlocked"];
    var cosmeticArrNewNames = ["AvatarsUnlocked", "FrameUnlocked", "CoverPhotoUnlocked"];

    for(let i = 0; i < cosmeticArrNames.length; ++i){
        var CosmeticUnlocked = [];
        for(const cosmeticID of res.get(cosmeticArrNames[i])){
            params = {
                "CosmeticID" : cosmeticID,
            }
            CosmeticUnlocked.push(JSON.parse(await Parse.Cloud.run("GetCosmeticData", params)));
        }
        res.set(cosmeticArrNewNames[i], CosmeticUnlocked);
    }

    //Pass EquippedCosmetics
    var EquippedCosmeticsData = [];
    for(const cosmeticID of res.get("EquippedCosmetics")){
        params = {
            "CosmeticID" : cosmeticID,
        }
        EquippedCosmeticsData.push(JSON.parse(await Parse.Cloud.run("GetCosmeticData", params)));
    }
    res.set("EquippedCosmeticsData", EquippedCosmeticsData);

    //Dont save, since we just want this to be passed to the caller
    return JSON.stringify(res);
});

Parse.Cloud.define("GetStudents", async(_request) => {
    const Student = Parse.Object.extend("Student");
    const query = new Parse.Query(Student);
    const res = await query.find();
    return JSON.stringify(res);
});

//Must specify id of student with name of "StudentID",
Parse.Cloud.define("AssignHouse", async(request) => {
    const House = Parse.Object.extend("House");
    const query = new Parse.Query(House); 
    const argument = request.params;
    const res = await query.find();
    const res2 = JSON.parse(JSON.stringify(res))
    let housePopulations = res2.map(obj => obj.HousePopulation) //makes an array of HousePopulation from the Houses
    let max = Math.max.apply(Math, housePopulations)
    let min = Math.min.apply(Math, housePopulations)
    let avail_houses = []
    if(min == max){
        avail_houses = res2;
    }
    else{
        for(const house of res2){
            if(house.HousePopulation == min){
                avail_houses.push(house);
            }
        }
    } 
    const idx = Global.getRndInteger(0, avail_houses.length)
    var params = {
        "StudentID" : argument.StudentID,
        "HouseID" : avail_houses[idx].objectId,
    }

    await Parse.Cloud.run("AddHouseMember", params);
    console.log("Successfully Assigned House");
});

//Must specify id of student with name of "StudentID" and new "HouseID"
Parse.Cloud.define("ChangeStudentHouse", async(request) => {
    const argument = request.params;
    const dataParams = {
        "StudentID": argument.StudentID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetStudentData", dataParams)
    
    var params = {
        "StudentID" : argument.StudentID,
        "HouseID" : res.get("StudentHouseIDPointer"),
    }
    await Parse.Cloud.run("DeleteHouseMember", params);
    
    params["HouseID"] = argument.HouseID;
    await Parse.Cloud.run("AddHouseMember", params);

    console.log("Successfully Changed House");
});

//Must specify id of student with name of "StudentID", along with three top trophiesID named "TrophiesID_1", "TrophiesID_2", "TrophiesID_3"
Parse.Cloud.define("ChangeTopTrophies", async(request) => {
    const argument = request.params;
    const dataParams = {
        "StudentID": argument.StudentID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetStudentData", dataParams)
    var ChosenTrophies = [argument.TrophiesID_1, argument.TrophiesID_2, argument.TrophiesID_3]

    for(let i = 0; i < ChosenTrophies.length; ++i){
        if(ChosenTrophies[i] == null){
            ChosenTrophies[i] = "";
        }
    }

    res.set("ChosenTrophies", ChosenTrophies);
    res.save().then(()=>{
        console.log("Successfully Edited Top Trophies");
    });
});

//Must specify id of student with name of "StudentID", CosmeticID and CosmeticType
Parse.Cloud.define("AddStudentCosmetic", async(request) => {
    const argument = request.params;
    const dataParams = {
        "StudentID": argument.StudentID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetStudentData", dataParams)
    var cosmeticName = {
        "Avatar" : "AvatarsIDUnlocked",
        "Frame" : "FrameIDUnlocked",
        "CoverPhoto" : "CoverPhotoIDUnlocked",
    };
    let cosmeticArr = res.get(cosmeticName[argument.CosmeticType]);
    cosmeticArr.push(argument.CosmeticID);
    res.set(cosmeticName[argument.CosmeticType], cosmeticArr);

    res.save().then(()=>{
        console.log("Successfully Added Cosmetics");
    });
});

//Must specify id of student with name of "StudentID", CosmeticID and CosmeticType
//Useful for event/timed cosmetic
Parse.Cloud.define("DeleteStudentCosmetic", async(request) => {
    const argument = request.params
    const dataParams = {
        "StudentID": argument.StudentID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetStudentData", dataParams)
    var cosmeticName = {
        "Avatar" : "AvatarsIDUnlocked",
        "Frame" : "FrameIDUnlocked",
        "CoverPhoto" : "CoverPhotoIDUnlocked",
    };
    let cosmeticArr = res.get(cosmeticName[argument.CosmeticType]);
    let index = cosmeticArr.indexOf(argument.CosmeticID);
    if(index > -1){
        cosmeticArr.splice(index, 1);
    }
    res.set(cosmeticName[argument.CosmeticType], cosmeticArr);

    res.save().then(()=>{
        console.log("Successfully Deleted Cosmetics");
    });
});

//Must specify id of student with name of "StudentID", CosmeticType and CosmeticID
Parse.Cloud.define("ChangeEquippedStudentCosmetic", async(request) => {
    const argument = request.params
    const dataParams = {
        "StudentID": argument.StudentID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetStudentData", dataParams)
    var cosmeticIndex = {
        "Avatar" : 0,
        "Frame" : 1,
        "CoverPhoto" : 2,
    };
    var index = cosmeticIndex[argument.CosmeticType];
    let cosmeticEquippedArr = res.get("EquippedCosmetics");
    cosmeticEquippedArr[index] = argument.CosmeticID;
    res.set("EquippedCosmetics", cosmeticEquippedArr);

    res.save().then(()=>{
        console.log("Successfully Changed Equipped Cosmetics!");
    });
});

//Must specify id of student with name of "StudentID", "DisplayTitle" with value of boolean
//Change console.log to the proper function of getting ascension title
Parse.Cloud.define("DisplayStudentXPTitle", async(request) => {
    const argument = request.params
    const dataParams = {
        "StudentID": argument.StudentID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetStudentData", dataParams)

    if(argument.DisplayTitle){
        var params = {"XpInput" : res.get("XP")};
        var xptitle = JSON.parse(await Parse.Cloud.run("SearchAscensionTitleFromXp", params));
        res.set("AscensionTitle", xptitle.AscensionName);
    }
    else{
        res.set("AscensionTitle", "");
    }

    res.save().then(()=>{
        console.log("Successfully Displayed/Hidden StudentXPTitle!");
    });
});

//If LeaderboardLimit is passed, then limit that query to that number
Parse.Cloud.define("GetStudentsLeaderboard", async(request) => {
    const Student = Parse.Object.extend("Student");
    const query = new Parse.Query(Student);
    const argument = request.params;
    query.descending("XP");
    if(argument.LeaderboardLimit !== undefined){
        query.limit(argument.LeaderboardLimit);
    }
    var res = await query.find();
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

//StudentID
Parse.Cloud.define("GetStudentLeaderboardRanking", async(request) =>{
    const argument = request.params;
    const dataParams = {
        "StudentID": argument.StudentID,
        "Type" : 1,
    }
    const res = await Parse.Cloud.run("GetStudentData", dataParams);
    var leaderboard = JSON.parse(await Parse.Cloud.run("GetStudentsLeaderboard"));
    for(const student of leaderboard){
        if(student.objectId === res.id){
            return JSON.stringify(student);
        }
    }
    return Promise.reject("Student Not Found");
});

//StudentID, XP
Parse.Cloud.define("ModifyStudentXP", async(request) =>{
    const argument = request.params
    const dataParams = {
        "StudentID": argument.StudentID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetStudentData", dataParams);
    var newXP = res.get("XP") + argument.XP;
    var ascensionTitleData = JSON.parse(await Parse.Cloud.run("SearchAscensionTitleFromXp", {"XpInput" : newXP}));
    res.set("XP", newXP);
    res.set("AscensionTitle", ascensionTitleData.AscensionName);
    res.save();
});

//StudentID
Parse.Cloud.define("GetStudentQuests", async(request) =>{
    const argument = request.params
    const dataParams = {
        "StudentID": argument.StudentID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetStudentData", dataParams);

    var lastLogin = res.get("StudentLastLogin");
    var params = {"QuestType" : "Daily", "NumOfQuests" : 2};

    if(lastLogin.Day === "" || Global.compareDate(Global.addDaysOnDate(lastLogin.Day, 1), Global.getDateToday(), "<=")){
        res.set("StudentDailyQuestsID",  JSON.parse(await Parse.Cloud.run("GetRandomQuests", params)));
        lastLogin["Day"] = Global.getDateToday();
    }
    params["QuestType"] = "Weekly";
    if(lastLogin.Week === "" || Global.compareDate(Global.addDaysOnDate(lastLogin.Week, 7), Global.getDateToday(), "<=")){
        res.set("StudentWeeklyQuestsID",  JSON.parse(await Parse.Cloud.run("GetRandomQuests", params)));
        lastLogin["Week"] = Global.getDateToday();
    }
    res.set("StudentLastLogin", lastLogin);
    res.save();
});

//StudentID, QuestID, QuestType
Parse.Cloud.define("CompleteStudentQuest", async(request) =>{
    const argument = request.params
    const dataParams = {
        "StudentID": argument.StudentID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetStudentData", dataParams);
    var quests = res.get("Student" + argument.QuestType + "QuestsID");

    var params = {"QuestID" : argument.QuestID};
    const QuestData = JSON.parse(await Parse.Cloud.run("GetQuestData", params));
    
    for(let i = 0; i < quests.length; ++i){
        if(quests[i].QuestID === argument.QuestID){
            quests.splice(i, 1);
            break;
        }
    }

    res.set("AscensionPoints", res.get("AscensionPoints") + QuestData.QuestPoints);
    res.set("Student" + argument.QuestType + "QuestsID", quests);
    res.save();
});