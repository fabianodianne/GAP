<template>
    <h3>Log In (Student Testing)</h3>
    <h3>Select Student Account</h3>
    <button @click="getStudents()">Show Students</button>
    <ul>
        <li v-for="student in Students" :key="student">{{student.LastName}} <button @click="selectStudent(student.objectId)">Select</button></li>
    </ul>
    <p>Selected Student: {{SelectedStudent}}</p>

    <hr>
    <h3>Request Badge</h3>
    <span>Proof: </span>
    <input @change="onProofFileSelected" type="file" accept=".xlsx,.xls,image/*,.doc, .docx,.ppt, .pptx,.txt,.pdf"/><br>
    <button @click="getTeachers()">Show Teachers to Request</button>
    <ul>
        <li v-for="teacher in Teachers" :key="teacher">{{teacher.LastName}} <button @click="selectTeacher(teacher.objectId)">Select</button></li>
    </ul>
    <p>Selected Teacher to Request: {{SelectedTeacher}}</p>
    <button @click="submitRequest()">Submit Request</button>

    <hr>
    <h3>Student Details</h3>
    <button @click="getStudentDetails">Show Details</button>
    <p>Badges</p>
    <ul>
        <li v-for="badge in Badges" :key="badge">{{badge.BadgeName}}</li>
    </ul>
    <p>Trophies</p>
    <ul>
        <li v-for="trophy in Trophies" :key="trophy">{{trophy.TrophyName}}</li>
    </ul>
    <p>Top 3 Trophies</p>
    <ul>
        <li v-for="trophy in TopThreeTrophies" :key="trophy">{{trophy.TrophyName}}</li>
    </ul>
</template>

<script>
    import Parse from 'parse';
    export default{
        data(){
            return{
                //RequestBadge
                Students : [],
                Teachers : [],
                SelectedStudent : '',
                SelectedTeacher : '',
                ProofFile: '',
                ProofName: '',

                //Student Details
                Badges : [],
                Trophies : [],
                TopThreeTrophies : [],
            }
        },
        components:{
           
        },
        methods:{
            async getStudents(){
                const res = JSON.parse(await Parse.Cloud.run("GetStudents"));
                this.Students = res;
            },
            selectStudent(id){
                this.SelectedStudent = id;
            },
            async getTeachers(){
                const res = JSON.parse(await Parse.Cloud.run("GetTeachers"));
                this.Teachers = res;
            },
            selectTeacher(id){
                this.SelectedTeacher = id;
            },
            async submitRequest(){
                var params = {
                    "ToRequestID" : this.SelectedTeacher,
                    "ToRequestType" : "Teacher",
                    "StudentIDPointer" : this.SelectedStudent,
                    "ProofFile" : this.ProofFile,
                    "ProofName" : this.ProofName,
                }
                await Parse.Cloud.run("AddRequest", params);
                alert("SUBMITTED REQUEST!");
            },

            //StudentDetails
            async getStudentDetails(){
                var params = {"StudentID" : this.SelectedStudent}
                const res = JSON.parse(await Parse.Cloud.run("GetStudentData", params));
                this.Badges = res.BadgesEarned;
                this.Trophies = res.TrophiesUnlocked;
                this.TopThreeTrophies = res.ChosenTrophiesData;
            },

            getBase64(file) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                });
            },
            
            //Proof File
            async onProofFileSelected(e){
                var file = e.target.files[0];
                this.ProofName = file.name;
                this.getBase64(file).then(
                    data => this.ProofFile = data
                );
            },
        },
    }
</script>