
    function shipLength (){
        var i=1;
        var j=1;
        var shipLength=1;
        while (i<2){
            i++;
            shipLength++;
        }
        while (j<1000000000){
            j++;
            shipLength++;
        }
        return shipLength;
    }

    console.log(shipLength());
