ok here is my problem statement: 

i am working as an intern at k12 techno servics, which provides services to it own maintained network of 140+ schools of orchicds international schools, I am building a vendor portal, which keeps track of vendors their works and payment for activites in a school, activities could be cleaning a swimming pool, building a new block, ir eveb prepping for an event..etc could be a wide range of acitivities.

it should have an admin portal, vendor app, and a backend

the admin portal to be done with react, the vendor app to be done with flutter and the backend is to be done with django which would support both the admin portal and the vendor app, and for the db use sqllite.

the whole system will have authentication with jwt and role based access,

for the admin portal it should be done using react,  the admin from the school only can access it and the vendors cannot access it, the admin can register the vendor, it should have the vendor's details like name, ph no, aadhar no, photo, etc,  then after registering the vendor it should create credentials for him which the vendor can use to log in in the vendor app not the admin app, as there are multiple branches, each branch has it seperate admin, and the vendors he register are to be mapped to that branch.


 then after this he can create the activity/job that needs to be done and assign a vendor to it. the jobs can be categorised to some types and the vendors when registering only are assisgned to that type only and when the admin is assigned the vendor, it should display all the vendors which perfor that category of the work, like cleaning the swimming pool can come under the cleaning category type etc, the admin can also add new types of work, but the registration of the vendors can only be done via the admin tab.
 
 
  after the work is assigned, the admin can check on the progess too by clicking on the activity. some of the works like clean the swimming pool can be assigned for 100 days and tell them to schedule it for every 3 days repeating, so the swimming pool is cleaned every 3 days for 100 days. some like building a library, can be assigned for 3 months and it might take more for completing so it should also show that, it took more than expected, and it should also show the expected amount of cost for that activity.


  the admin can also check the progess of the work for example the cleaning swimming pool only, after cleaning it the vendor gives details of what he has done that day in the vendor app and the admin can check the work done.


  some activities could only span for a day like decorating for an event, some could take a long time like building something, some could repeat everyfew days like cleaning swimming pool, some could have progess everyday like building something,


  now coming to the vendor app, the vendor after getting his credentials from the admin can login into the vedor app, so the vendor will have some employees under him, these employees he can register them himself in the vendor app, lets call the vendor owner and then his exployees, he can register his employees with their photo, name , phno and aadhar number, they are mapped under to the owner and after registration they will get their credentials that they can use them to login to the vendor app.


the onwer and the employees after logging in, in the dash board they will be shown the activity scheduled to them for that day, any of the employees or even the owners should take a before and after photo of the work and add it to that days log of what work and also explain what they did like: i have identified this problem and i have done this.

the vendors get paid in 3 types hourly basis, daily basis and on contract basis, it should track the expected cost and then after payment the admin will enter how much he actually paid.

ok now go into plan mode and then ask me question regarding this and i only have 1 and a half hour so use multiple agents to do the work paralelly and start
