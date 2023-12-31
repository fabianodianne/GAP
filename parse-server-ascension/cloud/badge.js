var Global = require('./global');

Parse.Cloud.define("AddBadge", async(request) => {
    const Badge = Parse.Object.extend("Badge");
    const badge = new Badge();
    const argument = request.params;

    var convertedImage = {base64: argument.BadgeImage};
    var parseFile = new Parse.File(argument.BadgeImageName, convertedImage);

    parseFile.save({ useMasterKey: true }).then(function(result) {
        var link = result.url();
        badge.save({
            "BadgeName" : argument.BadgeName,
            "BadgeDescription" : argument.BadgeDescription,
            "BadgePoints" : argument.BadgePoints,
            "BadgeImage" : link,
            "BadgeType" : argument.BadgeType,
            "BadgeDesignInspiration" : argument.BadgeDesignInspiration,
        }, { useMasterKey: true }).then(()=>{
            console.log("Successfully added Badge!");
        });
    });
});

//Must specify id of badge with name of "BadgeID"
Parse.Cloud.define("EditBadge", async(request) => {
    const argument = request.params
    const params = {
        "BadgeID": argument.BadgeID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetBadgeData", params)

    var list_of_attr = ["BadgeName", "BadgeDescription", "BadgePoints", 
                        "BadgeType", "BadgeDesignInspiration"
    ];
    
    var list_of_arguments =[argument.BadgeName, argument.BadgeDescription, argument.BadgePoints,
                            argument.BadgeType, argument.BadgeDesignInspiration
    ];

    for(let i = 0; i < list_of_attr.length; ++i){
        if(list_of_arguments[i] != null){
            res.set(list_of_attr[i], list_of_arguments[i]);
        }
    }

    if(argument.BadgeImage != null && argument.BadgeImageName != null){
        //Delete old image
        var imageToDelete = res.get("BadgeImage").replace('/myAppId','');
        var param = {"url" : imageToDelete};
        await Parse.Cloud.run("DeleteFile", param);

        var convertedImage = {base64: argument.BadgeImage};
        var parseFile = new Parse.File(argument.BadgeImageName, convertedImage);

        parseFile.save({ useMasterKey: true }).then(function(result) {
            var link = result.url();
            res.set("BadgeImage", link);
            res.save().then(()=>{
                console.log("Successfully Edited Badge");
            });
        });
    }
    else{
        res.save().then(()=>{
            console.log("Successfully Edited Badge");
        });
    }
});

Parse.Cloud.define("DeleteBadge", async(request) => {
    const argument = request.params
    const params = {
        "BadgeID": argument.BadgeID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetBadgeData", params)
    
    //If a student has this, return error
    var students = JSON.parse(await Parse.Cloud.run("GetStudents"));
    var param = {};
    for (const student of students){
        var BadgesRewardIDEarned = student.BadgesIDEarned;
        var BadgesIDEarned = [];
        for(const RewardID of BadgesRewardIDEarned){
            param = {"RewardID" : RewardID};
            let rewardData = JSON.parse(await Parse.Cloud.run("GetRewardData", param));
            BadgesIDEarned.push(rewardData.RewardID);
        }
        let index = BadgesIDEarned.indexOf(argument.BadgeID);
        if(index > -1){
            return Promise.reject("Cannot Delete Badge! One or more students have acquired this badge.");
        }
    }

    //If belongs to trophy, remove this one
    var trophies = JSON.parse(await Parse.Cloud.run("GetTrophies"));
    var trophiesEdited = false;
    for (const trophy of trophies){
        var BadgesIDNeeded = trophy.BadgesIDNeeded;
        let index = BadgesIDNeeded.indexOf(argument.BadgeID);
        if(index > -1){
            //If the badgesIDNeeded size is 1 and its found in this
            //Means its gonna be empty, just delete the trophy
            param = {"TrophyID" : trophy.objectId};
            if(BadgesIDNeeded.length <= 1){
                await Parse.Cloud.run("DeleteTrophy", param);
            }
            else{
                //splice this then save
                BadgesIDNeeded.splice(index, 1);
                param["BadgesIDNeeded"] = BadgesIDNeeded;
                await Parse.Cloud.run("EditTrophy", param);
                trophiesEdited = true;
            }
        }
    }
    
    //Delete image
    var imageToDelete = res.get("BadgeImage").replace('/myAppId','');
    param = {"url" : imageToDelete};
    await Parse.Cloud.run("DeleteFile", param);

    res.destroy().then(async()=>{
        console.log("Badge has been deleted!");
        if(trophiesEdited){
            //VerifyEligiblity for all students
            for (const student of students){
                param = {"StudentID" : student.objectId};
                await Parse.Cloud.run("VerifyTrophyEligibility", param);
            }
        }
    });
});

//Must specify id of badge with name of "BadgeID"; Specify Type to 1 only if you need the query's result (object)
//Returns the data of a badge or the query's result based on the value of Type
Parse.Cloud.define("GetBadgeData", async(request) => {
    const Badge = Parse.Object.extend("Badge");
    const query = new Parse.Query(Badge);
    const argument = request.params;
    query.equalTo("objectId", argument.BadgeID);
    const res = await query.first();
    if(argument.Type == 1){
        return res
    }
    return JSON.stringify(res);
    
});

//If BadgeType is defined, query depending on badgetype
Parse.Cloud.define("GetBadges", async(request) => {
    const Badge = Parse.Object.extend("Badge");
    const query = new Parse.Query(Badge);
    const argument = request.params;
    if(argument.BadgeType !== undefined){
        query.equalTo("BadgeType", argument.BadgeType);
    }
    const res = await query.find();
    return JSON.stringify(res);
});

//StudentID
Parse.Cloud.define("GetUnacquiredBadges", async(request) => {
    //Get Badges
    const Badge = Parse.Object.extend("Badge");
    const query = new Parse.Query(Badge);
    const argument = request.params;
    query.equalTo("BadgeType", "Student");
    const res = await query.find();

    //Gets the Student
    const Student = Parse.Object.extend("Student");
    const query1 = new Parse.Query(Student);
    query1.equalTo("objectId", argument.StudentID);
    const res1 = await query1.first();
    const studentBadges = res1.get("BadgesIDEarned");
    var acquiredBadges = {};
    
    for(const RewardID of studentBadges){
        var params = {"RewardID" : RewardID};
        let RewardData = JSON.parse(await Parse.Cloud.run("GetRewardData", params));
        acquiredBadges[RewardData.RewardID] = true;
    }
    
    var unacquiredBadges = [];
    for(const badge of res){
        if(!(badge.id in acquiredBadges)){
            unacquiredBadges.push(badge);
        }
    }
    return JSON.stringify(unacquiredBadges);
});

//HouseID
Parse.Cloud.define("GetUnacquiredHouseBadges", async(request) => {
    //Get Badges
    const Badge = Parse.Object.extend("Badge");
    const query = new Parse.Query(Badge);
    const argument = request.params;
    query.equalTo("BadgeType", "House");
    const res = await query.find();

    //Gets the House
    const House = Parse.Object.extend("House");
    const query1 = new Parse.Query(House);
    query1.equalTo("objectId", argument.HouseID);
    const res1 = await query1.first();
    const houseBadges = res1.get("HouseBadgesIDEarned");
    var acquiredBadges = {};
    
    for(const RewardID of houseBadges){
        var params = {"RewardID" : RewardID};
        let RewardData = JSON.parse(await Parse.Cloud.run("GetRewardData", params));
        acquiredBadges[RewardData.RewardID] = true;
    }
    
    var unacquiredBadges = [];
    for(const badge of res){
        if(!(badge.id in acquiredBadges)){
            unacquiredBadges.push(badge);
        }
    }
    return JSON.stringify(unacquiredBadges);
});

//BadgeID, StudentID needed
//For rewarding students
Parse.Cloud.define("RewardBadge", async(request) => {
    const argument = request.params
    //Query badge first, check if badge is good for student and get xp
    const params = {
        "BadgeID": argument.BadgeID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetBadgeData", params)

    if(res.get("BadgeType") != "Student"){
        return Promise.reject("Cannot Reward this Badge! This badge is not available for students.");
    }
    var badgeXP = res.get("BadgePoints");

    //Then Query student, then get the badgesIDEarned
    const Student = Parse.Object.extend("Student");
    const studentQuery = new Parse.Query(Student);
    studentQuery.equalTo("objectId", argument.StudentID);
    const res1 = await studentQuery.first();
    var badgesIDEarned = res1.get("BadgesIDEarned");

    //Add XP for student
    await Parse.Cloud.run("ModifyStudentXP", {"StudentID" : res1.id, "XP" : badgeXP});

    //Create a reward object, set rewardID as badgeID
    const Reward = Parse.Object.extend("Reward");
    const reward = new Reward();
    reward.save({
        "RewardID" : argument.BadgeID,
        "RewardType" : "Badge",
        "DateRewarded" : Global.getDateToday(),
    }).then(async(obj)=>{
        badgesIDEarned.push(obj.id);
        res1.set("BadgesIDEarned", badgesIDEarned);
        res1.save();

        //Then run trophy eligibility
        var param = {"StudentID" : argument.StudentID};
        await Parse.Cloud.run("VerifyTrophyEligibility", param);
    });
});

//BadgeID, HouseID
//For rewarding houses
Parse.Cloud.define("RewardHouseBadge", async(request) => {
    const argument = request.params;
    
    //Query badge first, check if badge is good for house and get xp
    const params = {
        "BadgeID": argument.BadgeID,
        "Type": 1,
    }
    const res = await Parse.Cloud.run("GetBadgeData", params)
    if(res.get("BadgeType") != "House"){
        return Promise.reject("Cannot Reward this Badge! This badge is not available for houses.");
    }
    var badgeXP = res.get("BadgePoints");
    
    //Then Query house, then get the houseBadgesIDEarned
    const House = Parse.Object.extend("House");
    const houseQuery = new Parse.Query(House);
    houseQuery.equalTo("objectId", argument.HouseID);
    const res1 = await houseQuery.first();
    var badgesIDEarned = res1.get("HouseBadgesIDEarned");
    var houseXP = res1.get("HouseXP");

    //Create a reward object, set rewardID as badgeID
    const Reward = Parse.Object.extend("Reward");
    const reward = new Reward();
    reward.save({
        "RewardID" : argument.BadgeID,
        "RewardType" : "Badge",
        "DateRewarded" : Global.getDateToday(),
    }).then(async(obj)=>{
        badgesIDEarned.push(obj.id);
        houseXP += badgeXP;
        res1.set("HouseBadgesIDEarned", badgesIDEarned);
        res1.set("HouseXP", houseXP);
        res1.save();

        //Then run trophy eligibility for house
        var param = {"HouseID" : argument.HouseID};
        await Parse.Cloud.run("VerifyHouseTrophyEligibility", param);
    });
});

//RewardID, StudentID, required
Parse.Cloud.define("RemoveBadge", async(request) =>{
    const Student = Parse.Object.extend("Student");
    const query = new Parse.Query(Student);
    const argument = request.params;
    query.equalTo("objectId", argument.StudentID);
    const res = await query.first();

    //GetBadgeData
    const badgeData = JSON.parse(await Parse.Cloud.run("GetRewardData", argument));
    var badgeXP = badgeData.RewardData.BadgePoints;

    //UpdateStudent
    //Subtract XP for student
    await Parse.Cloud.run("ModifyStudentXP", {"StudentID" : res.id, "XP" : -badgeXP});
    let rewards = res.get("BadgesIDEarned");
    const index = rewards.indexOf(argument.RewardID);
    if(index > -1){
        rewards.splice(index, 1);
    }
    res.set("BadgesIDEarned", rewards);
    res.save().then(async()=>{
        //Then Run VerifyRemoval
        await Parse.Cloud.run("VerifyTrophyRemoval", argument);
    });

    //Remove Reward Object
    const Reward = Parse.Object.extend("Reward");
    const query1 = new Parse.Query(Reward);
    query1.equalTo("objectId", argument.RewardID);
    const res1 = await query1.first();
    res1.destroy();
});

//RewardID, HouseID, required
Parse.Cloud.define("RemoveHouseBadge", async(request) =>{
    const House = Parse.Object.extend("House")
    const query = new Parse.Query(House);
    const argument = request.params;
    query.equalTo("objectId", argument.HouseID);
    const res = await query.first();

    //GetRewardData
    const badgeData = JSON.parse(await Parse.Cloud.run("GetRewardData", argument));
    var badgeXP = badgeData.RewardData.BadgePoints;

    //UpdateHouse
    let rewards = res.get("HouseBadgesIDEarned");
    let houseXP = res.get("HouseXP");
    const index = rewards.indexOf(argument.RewardID);
    if(index > -1){
        rewards.splice(index, 1);
    }
    res.set("HouseBadgesIDEarned", rewards);
    res.set("HouseXP", houseXP - badgeXP);
    res.save().then(async()=>{
        //Then Run VerifyRemoval for houses
        await Parse.Cloud.run("VerifyHouseTrophyRemoval", argument);
    });

    //Remove Reward Object
    const Reward = Parse.Object.extend("Reward");
    const query1 = new Parse.Query(Reward);
    query1.equalTo("objectId", argument.RewardID);
    const res1 = await query1.first();
    res1.destroy();
});