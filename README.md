Warship board game MEAN implementation

To run:
1.install node.js (https://nodejs.org/en/)
2.install mongodb (https://www.mongodb.com/)
3.run "npm install" from a folder, containing project files
3.run "node server.js" from a folder, containing project files
4.run mongodb (you should create some folders by hands)
5.set current db to playersList ("use playersList" command)
6.navigate to localhost:3000 at your browser
7.navigate to localhost:3000 at another window of your browser
7.enjoy


---------------------ChangeLog---------------------
---11.09.2017---
1. reworked all the application, so that now it can be swiched between mongoDB
and local storage by changing one variable (in case we don't want mongo in our project)
Or we can easily use any other db by adding some specific requests code without reworking all the app.
2. better code organization in general. Some little tweaks.
3. minor bugs fixed like angular ng-style not refreshing correctly
4. better git organization
---17.09.2017---
0. Deployed to the web. Now one can try the Battleship app on https://seafight-rsxskwatin.now.sh
1. Added a lot of game logic, so now u need to place all the ships, not only the simple ones.
Also it checks for ships to be placed properly and for a player trying to get more ships than allowed.
Tons of code here.
2. Added some animation to all cell changes.
3. Added some animation, so now you know when it is your turn.
4. Little UI tweaks.
---20.09.2017---
0.https://seafight-bavcybtylj.now.sh
1. Added auto-marking of killed ships
2. Improved code organization
3. Started work on design