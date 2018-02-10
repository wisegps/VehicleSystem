/**
 * Created with JetBrains WebStorm.
 * User: Eiby
 * Date: 14-3-17
 * Time: 下午4:38
 * wspub api wrapper
 *
 */
const ROOT_URL = 'http://202.78.201.49/wspubatc/service.asmx/GetServerList_json?jsoncallback=?';

// 获取地理位置
var getLocation = function(lon, lat, callback){
	var path = 'http://api.map.baidu.com/geocoder/v2/?location=' + lat + ',' + lon + '&output=json&pois=0&ak=647127add68dd0a3ed1051fd68e78900';
//  console.log(path);
    _get(path, function (obj) {
        callback(obj);
    });
};

Date.prototype.format = function (format) {
    var o = {
        "M+": this.getMonth() + 1, //month
        "d+": this.getDate(), //day
        "h+": this.getHours(), //hour
        "m+": this.getMinutes(), //minute
        "s+": this.getSeconds(), //second
        "q+": Math.floor((this.getMonth() + 3) / 3), //quarter
        "S": this.getMilliseconds() //millisecond
    };
    if (/(y+)/.test(format)) format = format.replace(RegExp.$1,
        (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)if (new RegExp("(" + k + ")").test(format))
        format = format.replace(RegExp.$1,
            RegExp.$1.length == 1 ? o[k] :
                ("00" + o[k]).substr(("" + o[k]).length));
    return format;
};

var raw = function (args) {
    var keys = Object.keys(args);
    keys = keys.sort();
    var newArgs = {};
    keys.forEach(function (key) {
        newArgs[key] = args[key];
    });

    var string = '';
    for (var k in newArgs) {
        if (k != 'sign') {
            if(typeof(args[k]) == 'object'){
                string += k + JSON.stringify(newArgs[k]);
            }else{
                string += k + newArgs[k];
            }
        }
    }
    return string;
};

// 产生url后面的拼接字符串
var raw2 = function (args) {
    var string = '';
    for (var k in args) {
        if(typeof(args[k]) == 'object'){
            string += '&' + k + '=' + encodeURIComponent(JSON.stringify(args[k]));
        }else{
            string += '&' + k + '=' + encodeURIComponent(args[k]);
        }
    }
    string = string.substr(1);
    return string;
};

// 调用国外wspub api
function WspubAPI() {
    this.ajax_function = function(obj){
		app.online = plus.networkinfo.getCurrentType() != plus.networkinfo.CONNECTION_NONE
		if(app.online){
			console.log(JSON.stringify(obj));
			mui.getJSONP(obj.url, obj.data, obj.success);
		}else{
			var errMsg = '网络无法访问，请稍后再试';
			if(i18next){
				errMsg = i18next.t("msg.err-network") || '网络无法访问，请稍后再试';
			}
			mui.toast(errMsg);
			var result = {
				status_code: 0x1001
			}
			obj.success(result);
		}
	};

	this._get = function(path, data, callback){
	    var obj = {
	        type: "GET", 
	        url: path, 
	        data: data, 
	        dataType: "jsonp",
	        success: function (obj) {
	            callback(obj);
	        }, 
	        error: function (obj) {
	            callback(obj);
	        }
	    };
	    this.ajax_function(obj);
	};
}

//http://202.78.201.49/wspubatc/service.asmx/GetServerList_json?jsoncallback=?
// 获取服务器列表
WspubAPI.prototype.getServerList = function (callback) {
    var path = ROOT_URL;
    this._get(path, {}, function (obj) {
        callback(obj);
    });
};

//http://202.78.201.49/wstrack3/service.asmx/Login_json?jsoncallback=?&p_strUserName=dhlhuawei&p_stdPassword=dhlhuawei
// 登陆测试
// 参数：account: 手机号码或者邮箱地址
//      passsword: md5(登陆密码)
// 返回：auth_code: api调用验证码
//      cust_id: 用户id
WspubAPI.prototype.login = function (url, account, password, callback) {
    var path = url + '/Login_json?jsoncallback=?';
    console.log("login: " + path);
    var data = {
    		p_strUserName: account,
    		p_stdPassword: password
    }
    this._get(path, data, function (obj) {
    		if(obj){
    			obj.status_code = 0;
    			obj.group = obj.GroupCode;    	
    			obj.uid = obj.UserID;
    			obj.access_token = 'wspub';
    			obj.expire_in = new Date();
    			callback(obj);
    		}else{
    			callback({
    				status_code: 1
    			});
    		}
    });
};

// 修改密码
// 参数：userId: 用户id
//      passsword: md5(登陆密码)
// 返回：
//      status_code: 调用状态
WspubAPI.prototype.resetPassword = function (url, userId, password, callback) {  
    var path = url + '/UpdatePassword_json?jsoncallback=?';
//	var path = 'http://192.168.3.88:8082/ws/Service.asmx/UpdatePassword_json?jsoncallback=?';
    var data = {
    		p_intUserID: userId,
    		p_strPassword: password
    }
//  console.log(path + "," + JSON.stringify(data));
    this._get(path, data, function (obj) {
//  		console.log(obj);
		if(parseInt(obj) == 0){
    			callback({
    				status_code: 0
    			});
    		}else{
    			callback({
    				status_code: 1
    			});
    		}
    });
};

//http://202.78.201.49/wstrack3/service.asmx/GetAllObjs_json?jsoncallback=jQuery17204200958624774598_1489743458915&p_strGroupCode=61%2C24%2C427%2C438%2C69%2C430%2C437%2C436%2C439%2C454%2C433%2C452%2C458%2C504&p_intType=0&_=1489743459455
//http://202.78.201.49/wstrack3/service.asmx/GetActiveTracks_json?jsoncallback=jQuery17203361223801205502_1490070409404&p_strGroupCode=61%2C24%2C427%2C438%2C69%2C430%2C437%2C436%2C439%2C454%2C433%2C452%2C458%2C504&p_intType=0&_=1490070412602
// 获取车辆列表
// 参数:
// 返回：
//    按fields返回数据列表
WspubAPI.prototype.getVehicleList = function(url, groupCode, callback) {
	var path = url + '/GetActiveTracks_json?jsoncallback=?';
	console.log('vehicle:' + path);
    var data = {
    		p_strGroupCode: groupCode,
    		p_intType: 0
    }
    this._get(path, data, function (obj) {
    		if(obj){
    			var ret = {
    		    		status_code: 0,
    		    		total: obj.length,
    		    		data: obj
    		    }
    			callback(ret);
    		}else{
    		    callback({
    		    		status_code: 0,
    		    		data: []
    		    });
    		}
    });
};

// 获取用户分组
WspubAPI.prototype.getCustomerList = function(url, groupCode, callback) {
	var path = url + '/GetAllObjs_json?jsoncallback=?';
	console.log('customer:' + path);
    var data = {
    		p_strGroupCode: groupCode,
    		p_intType: 0
    }
    this._get(path, data, function (obj) {
    		if(obj){
    			var ret = {
    		    		status_code: 0,
    		    		total: obj.length,
    		    		data: obj
    		    }
    			callback(ret);
    		}else{
    		    callback({
    		    		status_code: 0,
    		    		data: []
    		    });
    		}
    });
};

//http://202.78.201.49/wstrack3/service.asmx/GetAllObjs_json?jsoncallback=jQuery17204200958624774598_1489743458915&p_strGroupCode=61%2C24%2C427%2C438%2C69%2C430%2C437%2C436%2C439%2C454%2C433%2C452%2C458%2C504&p_intType=0&_=1489743459455
// 获取车辆明细
// 参数:
//   
// 返回：
//    按fields返回数据列表
WspubAPI.prototype.getVehicle = function (url, objectId, type, callback) {
	var path = url + '/GetGPSInfo_json?jsoncallback=?';
    var data = {
    		p_strObjectID: groupCode,
    		p_intType: type
    }
    this._get(path, data, function (obj) {
        callback(obj);
    });
};

//http://202.78.201.49/wstrack3/service.asmx/GetGPSCounts_json?jsoncallback=jQuery17206036171584242012_1489743819827&strGrouopCode=61%2C24%2C427%2C438%2C69%2C430%2C437%2C436%2C439%2C454%2C433%2C452%2C458%2C504&_=1489743820107
// 获取车辆状态计数
// 参数:
//   
// 返回：
//    按fields返回数据列表
WspubAPI.prototype.getCounter = function (url, groupCode, callback) {
	var path = url + '/GetGPSCounts_json?jsoncallback=?';
    var data = {
    		p_strGroupCode: groupCode,
    }
    this._get(path, data, function (obj) {
        callback(obj);
    });
};


//http://202.78.201.49/wstrack3/service.asmx/GetActiveTracks_json?jsoncallback=jQuery17206036171584242012_1489743819827&strGrouopCode=61%2C24%2C427%2C438%2C69%2C430%2C437%2C436%2C439%2C454%2C433%2C452%2C458%2C504&_=1489743820107
// 获取车辆状态计数
// 参数:
//   
// 返回：
//    按fields返回数据列表
WspubAPI.prototype.getActiveTracks = function (url, groupCode, callback) {
	var path = url + "/GetActiveTracks_json?jsoncallback=?";
    var data = {
    		p_strGroupCode:groupCode, 
    		p_intType:0
    }
    this._get(path, data, function (obj) {
        callback(obj);
    });
};

//http://202.78.201.49/wstrack3/service.asmx/GetTracksEx_json?jsoncallback=jQuery17207407895938413658_1489744883603&p_strGroupCode=56622820414&p_dtStartTime=2017-03-17+00%3A00%3A00&p_dtEndTime=2017-03-17+23%3A59%3A59&p_intFilter=0&_=1489744894667
// 获取车辆历史记录
// 参数:
//   
// 返回：
//    按fields返回数据列表
WspubAPI.prototype.getTracks = function (url, did, startTime, endTime, callback) {
	var path = url + "/GetTracksEx_json?jsoncallback=?";
	console.log(path);
    var data = {
    		p_strGroupCode: did, 
    		p_dtStartTime: startTime,
    		p_dtEndTime: endTime,
    		p_intFilter:0
    };
    console.log(JSON.stringify(data));
    this._get(path, data, function (obj) {
		if(obj){
    			var ret = {
    		    		status_code: 0,
    		    		total: obj.length,
    		    		data: obj
    		    }
    			callback(ret);
    		}else{
    		    callback({
    		    		status_code: 0,
    		    		total: 0,
    		    		data: []
    		    });
    		}
    });
};

//http://202.78.201.49/wstrack3/service.asmx/GetPOI_json?jsoncallback=jQuery17204022585956055895_1489745326216&intUserID=746&p_intType=0&_=1489745333171
// 获取车辆历史记录
// 参数:
//   
// 返回：
//    按fields返回数据列表
WspubAPI.prototype.getPOIs = function (url, userId, type, callback) {
	var path = url + "/GetPOI_json?jsoncallback=?";
    var data = {
    		intUserID: userId, 
    		p_intType: type
    };
    this._get(path, data, function (obj) {
		if(obj){
    			var ret = {
    		    		status_code: 0,
    		    		total: obj.length,
    		    		data: obj
    		    }
    			callback(ret);
    		}else{
    		    callback({
    		    		status_code: 0,
    		    		total: 0,
    		    		data: []
    		    });
    		}
    });
};

var wspub_api = new WspubAPI();