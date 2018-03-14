/**
 * 演示程序当前的 “注册/登录” 等操作，是基于 “本地存储” 完成的
 * 当您要参考这个演示程序进行相关 app 的开发时，
 * 请注意将相关方法调整成 “基于服务端Service” 的实现。
 **/

(function($, owner) {
	// api类型,wspub表示外国系统的api, wistorm表示最新平台的api
	owner.restType = 'wistorm'; 
	owner.updateTime = 0;
	owner.api = function(){
		return owner.restType == 'wistorm' ? wistorm_api: wspub_api;
	};
	
	owner.getMapType = function(){
			return 'BAIDU';
	};
	
	/**
	 * 系统初始化工作
	 * @param {callback} callback
	 */
	owner.init = function(callback){
		callback = callback || $.noop;
		if(owner.restType == "wspub"){
			owner.api().getServerList(function(json){
				console.log(JSON.stringify(json)); 
				callback(json);
			});
		}else{
			
		}
	}
	
	/**
	 * 用户登录
	 **/
	owner.login = function(loginInfo, callback) {
		callback = callback || $.noop;
		loginInfo = loginInfo || {};
		loginInfo.account = loginInfo.account || '';
		loginInfo.password = hex_md5(loginInfo.password) || '';
		var ret = owner.checkValidPhone(loginInfo.account);
		if (!ret.flag) {
			return callback(ret.message);
		}
		if (loginInfo.password.length < 6) {
			return callback('密码长度至少为6个字符');
		}
		var server = owner.getServer();
		
		wistorm_api.login(loginInfo.account, loginInfo.password, function(obj){
			console.log(JSON.stringify(obj));
			if(obj.status_code == 0){
				var state = owner.getState();
				state.account = loginInfo.account;
				state.password = loginInfo.password;
				state.uid = obj.user_type === 11 ? obj.pid : obj.uid;
				state.adminUser = obj.adminUser || 0;
				state.pay = obj.payEngine;				
				state.group = obj.group;
				state.token = obj.access_token;
				state.expire_in = new Date(obj.expire_in);
				owner.setState(state);
				if(owner.restType == "wistorm"){
					var query_json = {
						uid: obj.uid
					};
					wistorm_api._get('customer', query_json, 'name,contact,tel,treePath,other,logo', state.token, function(customer){
						if(customer && customer.data){
							state.logo = customer.data.logo || 'images/default.png';
							state.name = customer.data.name || loginInfo.account;
							var treePath = customer.data.treePath;
				            var trees = treePath.split(",");
				            trees = trees.filter(function(value){
				               return value !== "";
				            });
				            var query_json = {
				                uid: trees.join("|")
				            };
				            var parent_month_fee = 0;
				            var parent_year_fee = 0;
				            wistorm_api._list('customer', query_json, 'uid,other', 'uid', 'uid', 0, 0, 1, -1, state.token, function(custs){
				                console.log('custs: ' + JSON.stringify(custs));
				                if(custs.status_code === 0 && custs.total > 0){
				                    for(var i = 0; i < custs.total; i++){
				                        if(custs.data[i].uid !== obj.uid.toString()){
				                            parent_month_fee += parseFloat(custs.data[i].other.monthFee || 0);
				                            parent_year_fee += parseFloat(custs.data[i].other.yearFee || 0);
				                        }
				                    }
				                }
				                state.parent_month_fee = parent_month_fee;
				                state.parent_year_fee = parent_year_fee;
				                owner.setState(state);
								console.log(JSON.stringify(owner.getState()));
								return callback();
				            });
						}else{
							state.logo = 'images/default.png';
							state.name = loginInfo.account;
							// 更新一下customer, 以保证注册创建对应的customer
							owner.updateCustomer({name: loginInfo.account, custType: 7}, function(obj){
								console.log('update customer: ' + obj);
							});
						}
						owner.setState(state);
						console.log(JSON.stringify(owner.getState()));
						return callback();
					});
					// 设置clientid
					var query = {
						objectId: obj.uid
					};
//					var info = plus.push.getClientInfo();
					var update = {
						'authData.os': plus.os.name
//						'authData.pushCid': info.clientid,
//						"authData.pushToken": info.token
					};
					wistorm_api.update(query, update, state.token, function(obj){
						if(obj.status_code == 0){
						}else{
							console.log('Save params failed');
						}
					});	
				}else{
					return callback();
				}
			}else if(obj.status_code == 0x0001){
				return callback('帐户不可用');
			}else if(obj.status_code == 0x0002){
				return callback('密码错误');
			}else{
				return callback(obj.err_msg);
			}
		});
	};

	/*
	 * 判断token是否过期，并获取新的token
	*/
	owner.updateToken = function(callback){
		var state = owner.getState();
		var now = new Date();
		var expire_in = new Date(state.expire_in);
		if(expire_in < now){
			wistorm_api.getToken(state.account, state.password, 1, function(obj){
				state.token = obj.access_token;
				state.expire_in = new Date(obj.expire_in);
				owner.setState(state);
				return callback();
			});
		}else{
			return callback();
		}
	}
	
	/*
	 * 获取最新token
	 */
	owner.getToken = function(){
		var state = owner.getState();
		return state.token;
	}

	owner.createState = function(name, callback) {
		var state = owner.getState();
		state.account = name;
		state.token = "token123456789";
		owner.setState(state);
		return callback();
	};
	
	/*
	 * 检测手机号码是否合法
	 */
	owner.checkValidPhone = function(mobile) {
		var flag = false;
		var message = "";
		var myreg = /^(((13[0-9]{1})|(14[0-9]{1})|(17[0-9]{1})|(15[0-9]{1})|(18[0-9]{1})|(16[0-9]{1}))+\d{8})$/;
		var emailreg = /^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/;
		if(mobile == '') {
			message = "账号不能为空.";
		} else if(!myreg.test(mobile)) {
			message = "请输入有效的账号.";
		} else {
			flag = true;
		}
		return {
			flag: flag,
			message: message
		};
	}
	
	/*
	 * 判断手机号码是否已被注册
	 */
	owner.checkPhoneIsExist = function(mobile, callback){
		var query_json = {
		      mobile: mobile
		};
		wistorm_api.exists(query_json, 'uid', function (obj) {
		      return callback(obj.exist);
		});
	}
	
	/*
	 * 发送短信验证码
	 */
	owner.sendSMS = function(mobile, callback){
		wistorm_api.sendSMS(mobile, 1, "", 0, function(obj){
			console.log(JSON.stringify(obj));
			if(obj.status_code == 0){
				return callback(true, '短信验证码已发送');
			}else{
				return callback(false, '短信验证码发送失败，请重试');
			}
		});
	};
	
	/*
	 * 发送邮件验证码
	 */
	owner.sendEmail = function(email, callback){
		wistorm_api.sendEmail(email, 1, '', function(obj){
			console.log(JSON.stringify(obj));
			if(obj.status_code == 0){
				return callback(true, '验证码已经发送.');
			}else{
				return callback(false, '验证码发送失败，请稍后再试.');
			}
		});
	};	
	
	/*
	 * 校验验证码是否正确
	*/
	owner.checkValidCode =  function(mobile, validCode, callback){
		wistorm_api.validCode(mobile,'', 1, validCode, function(obj){
			console.log(JSON.stringify(obj));
			return callback(obj.valid);
		});
	}
	
	/*
	 * 校验密码是否正确
	*/
	owner.checkPassword =  function(password, password_confirm, callback){
		var result = {
			valid: false,
			message: ''
		};
		if(password == '') {
			result.message = "密码不能为空";
			return callback(result);
		} else if(password.length < 6) {
			result.message = "密码长度不能小于6个字符";
			return callback(result);
		} else if(password_confirm == '') {
			result.message = "密码确认不能为空。";
			return callback(result);
		} else if(password_confirm.length < 6) {
			result.message = "确认密码长度不能小于6个字符";
			return callback(result);
		} else if(password !== password_confirm){
			result.message = '密码确认与密码不一样';
			return callback(result);
		} else {
			result.valid = true;
			return callback(result);
		}
	}
	
	/*
	 * 检测设备id是否正确
	 */
	owner.checkDeviceId = function(deviceId, callback){
		var result = {
			flag: false,
			message: '',
			parentId: 0
		};
		if(deviceId == '') {
			result.message = "IMEI 不能为空";
			return callback(result);
		} else if(deviceId.length < 11) {
			result.message = "请输入有效的 IMEI";
			return callback(result);
		} 	
		//判断设备ID是否存在
		var query = {
			did: deviceId
		};
		wistorm_api._get('_iotDevice', query, 'binded,uid,activedIn,params', owner.getToken(), function(dev){
			console.log('dev:' + JSON.stringify(dev));
			//判断设备ID是否已被其他用户绑定
			if(dev.status_code == 0 && dev.data == null){
				result.message = "IMEI 不存在.";
				return callback(result);
			}else{
				wistorm_api._get('vehicle', query, 'did', owner.getToken(), function(vehicle){
					console.log('vehicle:' + JSON.stringify(vehicle));
					if(vehicle.data){
						result.message = "此IMEI已经绑定的其他车辆，请更换其他 IMEI.";
						return callback(result);		
					}else{
						query = {
							uid: dev.data.uid[dev.data.uid.length-1]
						};
						wistorm_api._get('customer', query, 'uid,treePath', owner.getToken(), function(customer){
							console.log('customer:' + JSON.stringify(customer));
							if(customer.data){
								result.parentId = customer.data.uid;
								result.treePath = customer.data.treePath;
//								result.activedIn = new Date();
								result.activedIn = dev.data.activeIn || new Date();
								var serviceRegDate = new Date();
								var serviceExpireIn = new Date(serviceRegDate.setMonth(serviceRegDate.getMonth() + 6));
								result.serviceRegDate = dev.data.params && dev.data.params.serviceRegDate ? dev.data.params.serviceRegDate : serviceRegDate;
								result.serviceExpireIn = dev.data.params && dev.data.params.serviceExpireIn ? dev.data.params.serviceExpireIn : serviceExpireIn;
								result.flag = true;
							}else{
								result.message = "用户不存在.";
							}
							return callback(result);		
						});
					}
				});
			}
		});
	}

	/*
	 * 检测车牌号是否正确
	 */
	owner.checkPlate = function(plate, callback){
		var result = {
			flag: false,
			message: ''
		};
		if(plate == '') {
			result.message = "车牌号不能为空";
			return callback(result);
		} 	
		//判断车牌是否存在
		var query = {
			name: plate
		};
		wistorm_api._get('vehicle', query, 'name', owner.getToken(), function(vehicle){
			console.log(JSON.stringify(vehicle));
			if(vehicle.data){
				result.message = "车牌号已存在，请更换其它车牌号.";
			}else{
				result.flag = true;
			}
			return callback(result);		
		});
	}

	/**
	 * 新用户注册
	 **/
	owner.reg = function(regInfo, callback) {
		callback = callback || $.noop;
		regInfo = regInfo || {};
		regInfo.account = regInfo.account || '';
		regInfo.password = regInfo.password || '';
		regInfo.validCode = regInfo.validCode || '';
		if (regInfo.account.length < 11) {
			return callback('手机号码格式不正确');
		}
		if (regInfo.password.length < 6) {
			return callback('密码至少6个字符');
		}
		owner.checkPhoneIsExist(regInfo.account, function(exist){
			if(exist){
				return callback('该手机号码已经注册.');
			}else{
				var token = 'a4643cadae73ad91f8bb8e43a5e04c4beef83c30842f915b113f674c809994db88e0e5763aa116f7c3a93d190f87f11fc3c8c8e3b9c7e26cd3dac0bf04b47841';
				wistorm_api.create('', regInfo.account,'',  hex_md5(regInfo.password), 7, token, function(obj){
					if(obj.status_code == 0){
						return callback();
					}else{
						return callback('注册失败，重新注册.');
					}
				});
			}
		});
//		var users = JSON.parse(localStorage.getItem('$users') || '[]');
//		users.push(regInfo);
//		localStorage.setItem('$users', JSON.stringify(users));
	};
	
	/*
	 * 获取账号信息
	 */
	owner.getUser = function(callback){
		var state = owner.getState();
		if(state){
			var query = {
				objectId: state.uid
			};
			wistorm_api.get(query, 'username,mobile,mobileVerified,email,emailVerified,authData', state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(obj);
				}else{
					return callback('获取账号信息失败，请稍后重试');
				}
			});
		}else{
			return callback('未知错误，请重新尝试登陆');
		}
	};
	
	/*
	 * 保存账号信息
	 */
	owner.updateUser = function(update, callback){
		var state = owner.getState();
		if(state){
			var query = {
				objectId: state.uid
			};
			wistorm_api.update(query, update, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback();
				}else{
					return callback('保存账号信息失败，请稍后重试');
				}
			});
		}else{
			return callback('未知错误，请重新尝试登陆');
		}
	};
	
	/*
	 * 保存报警设置选项
	 */
	owner.updateAlertOptions = function(options, callback){
		var state = owner.getState();
		if(state){
			var query = {
				objectId: state.uid
			};
			var update = {
				'authData.alertOptions': options
			};
			wistorm_api.update(query, update, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback();
				}else{
					return callback('保存报警设置失败，请稍后重试');
				}
			});
		}else{
			return callback('未知错误，请重新尝试登陆');
		}
	};	
	
	/*
	 * 获取用户信息
	 */
	owner.getCustomer = function(callback){
		var state = owner.getState();
		if(state){
			var query = {
				uid: state.uid
			};
			wistorm_api._get('customer', query, 'logo,name,sex,province,city,area,address,contact,tel,custType,custTypeId', state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(obj);
				}else{
					return callback('获取用户信息失败，请稍后重试');
				}
			});
		}else{
			return callback('未知错误，请重新尝试登陆');
		}
	};
	
	/*
	 * 保存用户信息
	 */
	owner.updateCustomer = function(update, callback){
		var state = owner.getState();
		if(state){
			var query = {
				uid: state.uid
			};
			wistorm_api._get('customer', query, 'uid', state.token, function(customer){
				if(customer.status_code == 0 && customer.data){
					wistorm_api._update('customer', query, update, state.token, function(obj){
						console.log(JSON.stringify(obj));
						if(obj.status_code == 0){
							return callback();
						}else{
							return callback('保存用户信息失败，请稍后重试');
						}
					});
				}else{
					var createJson = update;
					createJson.uid = state.uid;
					wistorm_api._create('customer', createJson, state.token, function(obj){
						console.log(JSON.stringify(obj));
						if(obj.status_code == 0){
							return callback();
						}else{
							return callback('保存用户信息失败，请稍后重试');
						}
					});
				}
			});
		}else{
			return callback('未知错误，请重新尝试登陆');
		}
	};	

	/**
	 * 获取当前状态
	 **/
	owner.getState = function() {
		var stateText = localStorage.getItem('$state') || "{}";
		return JSON.parse(stateText);
	};

	/**
	 * 设置当前状态
	 **/
	owner.setState = function(state) {
		state = state || {};
		localStorage.setItem('$state', JSON.stringify(state));
	};

	var checkEmail = function(email) {
		email = email || '';
		return (email.length > 3 && email.indexOf('@') > -1);
	};

	/**
	 * 找回密码
	 **/
	owner.forgetPassword = function(regInfo, callback) {
		callback = callback || $.noop;
		regInfo = regInfo || {};
		regInfo.account = regInfo.account || '';
		regInfo.password = regInfo.password || '';
		var state = owner.getState();
		
		wistorm_api.resetPassword(regInfo.account, hex_md5(regInfo.password), 1, regInfo.validCode, function(obj){
			console.log(obj);
			if(obj.status_code == 0){
				return callback();
			}else{
				return callback('修改密码失败，请稍后再试.');
			}
		});
	};
	
	/*
	 * 更新设备信息
	 */
	owner.updateDevice = function(did, update, callback) {
		var query = {
			did: did
		};
		wistorm_api._update('_iotDevice', query, update, owner.getToken(), function(obj) {
			
			return callback(obj);
		});
	};
	
	/*
	 * 添加车辆
	 */
	owner.addVehicle = function(did, plate, brand, battery, buyDate, color, parentId, treePath, activedIn, serviceRegDate, serviceExpireIn, callback){
		var state = owner.getState();
		if(state){
//			var serviceRegDate = new Date(activedIn);
//			var serviceExpireIn = new Date(activedIn.setMonth(activedIn.getMonth() + 6));
			var create = {
				uid: state.uid,
				did: did,
				name: plate,
				brand: brand,
				battery: battery,
				buyDate: buyDate,
				color: color,
				serviceRegDate: serviceRegDate.format('yyyy-MM-dd'),
				serviceExpireIn: serviceExpireIn.format('yyyy-MM-dd'),
				parentId: parentId,
				treePath: treePath,
				activedIn: serviceRegDate.format('yyyy-MM-dd')
			};
			wistorm_api._create('vehicle2', create, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
//					return callback(null, obj.objectId);
//					if(parentId && parentId.length > 0){
//						// 更新用户的上级用户
//						var query = {
//							uid: state.uid	
//						};
//						var update = {
//							parentId: '%2B' + parentId,
//							treePath: treePath + state.uid + ','
//						}
//						wistorm_api._update('customer', query, update, state.token, function(customer){
//							console.log('Update customer:' + JSON.stringify(customer));
//							if(customer.status_code == 0){
//							}else{
//								console.log('Update customer failed, pls try again later');
//							}
//							var now = new Date();
//							// 更新设备的激活时间
//							var update = {
//								activedIn: activedIn.format('yyyy-MM-dd'),
//								vehicleId: obj.objectId,
//								vehicleName: plate,
//								uid: '%2B' + state.uid,
//								binded: true,
//								bindDate: now.format('yyyy-MM-dd hh:mm:ss')
//							};
//							owner.updateDevice(did, update, function(dev) {
//								console.log('Update device:' + JSON.stringify(dev));
//								if(dev.status_code == 0) {
//									return callback(null, obj.objectId);
//								} else {
//									console.log('Update device failed, pls try again later');
//								}
//							});
//						});
//						wistorm_api._update('_iotDevice', query, update, state.token, function(dev){
//							if(dev.status_code == 0){
//							}else{
//								console.log('更新设备激活时间失败，请稍后重试');
//							}
//						});
//					}else{
//						return callback(null, obj.objectId);
//					}
					return callback(null, obj.objectId);
				}else{
					return callback('添加设备失败，请稍后添加.');
				}
			});
		}else{
			return callback('未知错误，请重新尝试登陆');
		}
	};

	/*
	 * 保存车辆
	 */
	owner.updateVehicle = function(objectId, did, plate, brand, battery, buyDate, color, oldDid, callback){
		var state = owner.getState();
		if(state){
			var query = {
				objectId: parseInt(objectId)
			};
			var update = {
				uid: state.uid,
				did: did,
				name: plate,
				brand: brand,
				battery: battery,
				buyDate: buyDate,
				color: color,
				oldDid: oldDid
			};
			wistorm_api._update('vehicle2', query, update, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
//					// 解绑老的设备
//					var update = {
//						vehicleId: '',
//						vehicleName: '',
//						binded: false,
//						uid: '-' + state.uid,
//					};
//					owner.updateDevice(oldDid, update, function(dev) {
//						console.log('Update device:' + JSON.stringify(dev));
//						if(dev.status_code == 0) {
//						} else {
//							console.log('Update old device failed, pls try again later');
//						}
//					});
//					var now = new Date();
//					update = {
//						vehicleId: objectId,
//						vehicleName: plate,
//						uid: '%2B' + state.uid,
//						binded: true,
//              			bindDate: now.format('yyyy-MM-dd hh:mm:ss')
//					};
//					owner.updateDevice(did, update, function(dev){
//						if(dev.status_code == 0){
//						}else{
//							console.log('Update vehicle failed, pls try again later.');
//						}							
//					});
					return callback();
				}else{
					return callback('更新车辆失败，请稍后再试.');
				}
			});
		}else{
			return callback('未知错误，请重新尝试登陆');
		}
	};
	
		/*
	 * 获取用户列表
	 */
	owner.listCustomer = function(callback){
		var state = owner.getState();
		if(state){
			var query = {
				parentId: state.uid
			};
			wistorm_api._list('customer', query, 'uid,name', '-name', '-name', 0, 0, 1, -1, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					// 把本级id也加入
					obj.data.splice(0, 0, {
						uid: state.uid,
						name: state.name
					}); 
					return callback(obj);
				}else if(obj.status_code == 0x1001){
					return callback(null, obj.err_msg);
				}else{
					return callback(null, '获取用户列表失败，请稍后再试.');
				}
			});
		}else{
			return callback('未知错误，请重新尝试登陆');
		}
	};	

	/*
	 * 获取车辆列表
	*/
	owner.listVehicle = function(uids, callback){
		var state = owner.getState();
		if(state){
			var query = {
				uid: uids.join('|')
			};	
			wistorm_api._list('vehicle', query, '', 'uid,-name', 'uid', 0, 0, 1, -1, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(obj);
				}else if(obj.status_code == 0x1001){
					return callback(null, obj.err_msg);
				}else{
					return callback(null, '获取车辆列表失败，请稍后再试.');
				}
			});
		}else{
			return callback('未知异常, 请重新登录尝试');
		}
	};		
	
	/*
	 * 获取设备数据列表
	*/
	owner.listDevices = function(uids, callback){
		var state = owner.getState();
		if(state){
//			var startTime = owner.updateTime.format("yyyy-MM-dd hh:mm:ss");''
			var startTime = "1970-01-01 00:00:00"
			var query = {
				uid: uids.join('|'),
//				map: 'GOOGLE',BAIDU
				map: 'BAIDU',
				'activeGpsData.rcvTime': startTime + '@2100-01-01'
			};	
			wistorm_api._list('_iotDevice', query, 'vehicleId,vehicleName,did,accOffTime,activeGpsData,params,uid', '-activeGpsData.rcvTime', '-activeGpsData.rcvTime', 0, 0, 1, -1, state.token, function(obj){
				console.log('get devices: ' + JSON.stringify(obj));
				if(obj.status_code == 0){
					if(obj.data.length > 0){
			            owner.updateTime = new Date(obj.data[0].activeGpsData.rcvTime);
			            owner.updateTime.setSeconds(owner.updateTime.getSeconds() + 1);
			        }
					return callback(obj);
				}else if(obj.status_code == 0x1001){
					return callback(null, obj.err_msg);
				}else{
					return callback(null, '设备列表失败，请稍后再试.');
				}
			});
		}else{
			return callback('未知错误，请重新尝试登陆');
		}
	};	
	
	
	/*
	 * 获取我的账号明细
	 */
	owner.listBill = function(startTime, endTime, callback){
		var state = owner.getState();
		if(state){
			wistorm_api.getBillList(state.uid, startTime, endTime, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(obj);
				}else{
					return callback('获取账单明细数据失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}	
	};	
	
	/*
	 * 获取POI
	 */
	owner.listPOI = function(callback){
		var state = owner.getState();
		if(state){
			if(owner.restType == "wspub"){
				var server = owner.getServer();
				owner.api().getPOIs(server.url, state.uid, 0, function(obj){
					console.log(JSON.stringify(obj)); 
					if(obj.status_code == 0){
						return callback(obj);
					}else{
						return callback("获取POIS失败，请稍后获取");
					}
				});
			}else{
				return callback("未知错误，请重新尝试登陆");
			}
		}else{
			return callback("未知错误，请重新尝试登陆");
		}
	};			

	/*
	 * 删除车辆
	 */
	owner.deleteVehicle = function(objectId, did, callback){
		var state = owner.getState();
		if(state){
			var query = {
				objectId: parseInt(objectId),
				uid: state.uid,
				did: did
			};
			wistorm_api._delete('vehicle2', query, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
//					// 解绑老的设备
//					var update = {
//						vehicleId: '',
//						vehicleName: '',
//						binded: false,
//						uid: '-' + state.uid,
//					};
//					owner.updateDevice(did, update, function(dev) {
//						console.log('Update device:' + JSON.stringify(dev));
//						if(dev.status_code == 0) {
//							return callback();
//						} else {
//							console.log('Update old device failed, pls try again later');
//						}
//					});
					return callback();
				}else{
					return callback('车辆删除失败，请稍后重试.');
				}
			});
		}else{
			return callback('未知错误，请重新尝试登陆');
		}
	};	
	
	/*
	 * 获取车辆信息
	*/
	owner.getVehicle = function(objectId, callback){
		var state = owner.getState();
		if(state){
			var query = {
				objectId: parseInt(objectId)
			};
			wistorm_api._get('vehicle', query, 'objectId,name,did,brand,battery,buyDate,color,serviceRegDate,serviceExpireIn', state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(obj.data);
				}else{
					return callback();
				}
			});
		}else{
			return callback('未知错误，请重新尝试登陆');
		}
	};	
	
	/*
	 * 获取设备信息
	*/
	owner.getDevice= function(did, callback){
		var state = owner.getState();
		if(state){
			var query = {
				did: did,
				map: owner.getMapType()
			};
			wistorm_api._get('_iotDevice', query, 'activeGpsData,params,uid', state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(obj.data);
				}else{
					return callback();
				}
			});
		}else{
			return callback('未知错误，请重新尝试登陆');
		}
	};	
	
	/*
	 * 保存电子栅栏大小
	 */
	owner.setGeofenceWidth = function(did, width, callback){
		var state = owner.getState();
		if(state){
			var query = {
				did: did
			};
			var update = {
				'params.geofenceWidth': width
			};
			wistorm_api._update('_iotDevice', query, update, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback();
				}else{
					return callback('保存电子栅栏参数失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};	
	
	/*
	 * 保存电子栅栏中心点
	 */
	owner.setGeofence = function(did, lon, lat, width, callback){
		var state = owner.getState();
		if(state){
			var query = {
				did: did
			};
			var update = {
				'params.geofenceLon': lon,
				'params.geofenceLat': lat,
				'params.geofenceWidth': width
			};
//			console.log(JSON.stringify(update));
			wistorm_api._update('_iotDevice', query, update, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback();
				}else{
					return callback('设置电子栅栏失败，请稍后重试');
				}
			});
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	};	
	
	/*
	 * 发送指令
	 */
	owner.sendCount = 0;
	owner.sendCommand = function(did, cmdType, params, type, remark, duration, callback){
		var state = owner.getState();
		if(state){
//			var type = type || 0;
//			var remark = remark || '';
			console.log('send command, no = ' + owner.sendCount);
			owner.sendCount++;
			wistorm_api.createCommand(did, cmdType, params, type, remark, duration, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					owner.sendCount = 0;
					if(type == 0 && obj.send_status === false){
						return callback(remark + '失败.');	
					}else{
						return callback();
					}
				}else if(obj.status_code == 0x1001){
					return callback(obj.err_msg);
				}else if(obj.status_code == 0x0006){
					owner.sendCount = 0;
					return callback('设备离线，请检查并重试.');
				}else if(obj.status_code == 0x9012 && type == 1){
					owner.sendCount = 0;
//					alert('车型设定成功！');
					return callback('车型设定成功！');
				}else{
//					alert(obj.status_code);
					if(owner.sendCount < 3 && type == 0){
						owner.sendCommand(did, cmdType, params, type, remark, duration, callback);
					}else{
						owner.sendCount = 0;
						return callback('发送命令超时，请稍后再试.');						
					}
				}
			})
		}else{
			return callback("未知错误，请重新尝试登陆");
		}
	};

	/*
	 * 获取报警列表
	 */
	owner.listAlert = function(did, alertType, minId, maxId, callback){
		var state = owner.getState();
		if(state){
			var query = {did: did};
			if(alertType != 0){
				var query = {
					did: did,
					alertType: alertType
				};
			}
			wistorm_api._list('_iotAlert', query, 'objectId,did,alertType,lon,lat,speed,direct,status,createdAt', '-createdAt', 'createdAt', minId, maxId, 0, 10, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(obj);
				}else{
					return callback('报警列表获取失败，请稍后重试.');
				}
			});
		}else{
			return callback("未知错误，请重新尝试登陆");
		}
	};	
	
	/*
	 * 获取未处理报警计数
	 */
	owner.undealAlert = function(did, callback){
		var state = owner.getState();
		if(state){
			var query = {did: did, status: 0};
			wistorm_api._count('_iotAlert', query, state.token, function(obj){
				console.log(JSON.stringify(obj));
				var count = obj.status_code == 0 ? obj.count: 0;
				callback(count);
			});
		}else{
			return callback(0);
		}
	};
	
	/*
	 * 保存报警状态
	 */
	owner.updateAlert = function(objectId, status, callback){
		var state = owner.getState();
		if(state){
			var query = {
				objectId: parseInt(objectId)
			};
			var update = {
				status: status
			};
			wistorm_api._update('_iotAlert', query, update, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback();
				}else{
					return callback('报警状态更新失败，请稍后重试.');
				}
			});
		}else{
			return callback('未知错误，请重新尝试登陆');
		}
	};
	
	/*
	 * 处理所有报警状态
	 */
	owner.updateAllAlert = function(did, status, callback){
		var state = owner.getState();
		if(state){
			var query = {
				did: did,
				status: 0
			};
			var update = {
				status: status
			};
			wistorm_api._update('_iotAlert', query, update, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback();
				}else{
					return callback('更新所有警报状态失败，请稍后再试.');
				}
			});
		}else{
			return callback('未知错误，请重新尝试登陆');
		}
	};	
	
	/*
	 * 获取轨迹列表
	 */
	owner.listGpsData = function(did, startTime, endTime, callback){
		var state = owner.getState();
		if(state){
			if(owner.restType == "wspub"){
				var server = owner.getServer();
				wspub_api.getTracks(server.url, did, startTime, endTime, function(obj){
					console.log(JSON.stringify(obj));
					if(obj.status_code == 0){
						return callback(obj);
					}else{
						return callback('回放数据失败，请稍后再试');
					}					
				});
			}else{
				var query = {
					did: did,
					gpsTime: startTime + '@' + endTime,
					map: owner.getMapType()
				};
				wistorm_api._list('_iotGpsData', query, 'lon,lat,speed,direct,status,alerts,rcvTime,gpsTime', 'gpsTime', 'gpsTime', 0, 0, 0, -1, state.token, function(obj){
					console.log(JSON.stringify(obj));
					if(obj.status_code == 0){
						return callback(obj);
					}else{
						return callback('回放数据失败，请稍后再试');
					}
				});
			}
		}else{
			return callback("未知错误，请重新尝试登陆");
		}
	};	
	
	/*
	 * 设置当前选中车辆
	 */
	owner.setCurrentVehicle = function(vehicle){
		var state = owner.getState();
		state.vehicle = vehicle;
		if(!state.vehicles){
			state.vehicles = {};
		}
		if(vehicle){
			state.vehicles[vehicle.did] = vehicle;			
		}
		owner.setState(state);
	};
	
	/*
	 * 获取广告记录
	 */
	owner.getServer = function(){
		var state = owner.getState();
		return state.server;
	};
	
	/*
	 * 保存选择的服务器记录
	 */
	owner.setServer = function(server){
		var state = owner.getState();
		state.server = server;
		owner.setState(state);
	};
	
	/*
	 * 获取广告记录
	 */
	owner.getAD = function(){
		var state = owner.getState();
		return state.ad;
	};
	
	/*
	 * 保存广告记录
	 */
	owner.setAD = function(ad){
		var state = owner.getState();
		state.ad = ad;
		owner.setState(state);
	};
	
	/*
	 * 获取当前选中车辆
	 */
	owner.getCurrentVehicle = function(){
		var state = owner.getState();
		return state.vehicle;
	};
	
	/*
	 * 获取指定车辆
	 */
	owner.getLocalVehicle = function(did){
		var state = owner.getState();
		return state.vehicles[did];		
	}
	
	/*
	 * 添加预约
	 */
	owner.addBooking = function(name, mobile, city, sex, callback){
		var state = owner.getState();
		if(state){
			var create = {
				name: name,
				mobile: mobile,
				city: city,
				sex: sex
			};
			wistorm_api._create('booking', create, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(null, obj.objectId);
				}else{
					return callback('预约失败，请稍后重试');
				}
			});
		}else{
			return callback('未知错误，请重新尝试登陆');
		}
	};	
	
	/*
	 * 获取服务网点
	 */
	owner.listBranch = function(city, min_id, max_id, callback){
		var state = owner.getState();
		if(state){
			var query = {
				objectId: '>0'
			};
			if(city != ''){
				query.city = city;
			}
			wistorm_api._list('branch', query, 'objectId,name,contact,tel,mobile,city,address,lon,lat,createdAt', '-createdAt', 'createdAt', min_id, max_id, 0, -1, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(obj);
				}else{
					return callback('获取服务网点数据失败，请稍后重试');
				}
			});
		}else{
			return callback('未知错误，请重新尝试登陆');
		}	
	};
	
	/*
	 * 获取文章
	 */
	owner.listArticle = function(type, minId, maxId, limit, callback){
		var state = owner.getState();
		if(state){
			var query = {
				type: type
			};
			wistorm_api._list('article', query, 'objectId,title,summary,author,img,createdAt', '-createdAt', 'createdAt', minId, maxId, 0, limit, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(obj);
				}else{
					return callback('获取文章数据失败，请稍后重试');
				}
			});
		}else{
			return callback('未知错误，请重新尝试登陆');
		}	
	};	
	
	/*
	 * 添加预约
	 */
	owner.addFeedback = function(account, name, contact, content, score, deviceInfo, callback){
		var state = owner.getState();
		if(state){
			var create = {
				account: account,
				name: name,
				contact: contact,
				content: content,
				score: score,
				deviceInfo: deviceInfo,
				status: 0
			};
			wistorm_api._create('feedback', create, state.token, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback(null, obj.objectId);
				}else{
					return callback('反馈失败，请稍后重试');
				}
			});
		}else{
			return callback('未知错误，请重新尝试登陆');
		}
	};	

	/**
	 * 获取应用本地配置
	 **/
	owner.setSettings = function(settings) {
		settings = settings || {};
		localStorage.setItem('$settings', JSON.stringify(settings));
	}

	/**
	 * 设置应用本地配置
	 **/
	owner.getSettings = function() {
			var settingsText = localStorage.getItem('$settings') || "{}";
			return JSON.parse(settingsText);
		}
		/**
		 * 获取本地是否安装用户端
		 **/
	owner.isInstalled = function(id) {
		if (id === 'qihoo' && mui.os.plus) {
			return true;
		}
		if (mui.os.android) {
			var main = plus.android.runtimeMainActivity();
			var packageManager = main.getPackageManager();
			var PackageManager = plus.android.importClass(packageManager)
			var packageName = {
				"qq": "com.tencent.mobileqq",
				"weixin": "com.tencent.mm",
				"sinaweibo": "com.sina.weibo"
			}
			try {
				return packageManager.getPackageInfo(packageName[id], PackageManager.GET_ACTIVITIES);
			} catch (e) {}
		} else {
			switch (id) {
				case "qq":
					var TencentOAuth = plus.ios.import("TencentOAuth");
					return TencentOAuth.iphoneQQInstalled();
				case "weixin":
					var WXApi = plus.ios.import("WXApi");
					return WXApi.isWXAppInstalled()
				case "sinaweibo":
					var SinaAPI = plus.ios.import("WeiboSDK");
					return SinaAPI.isWeiboAppInstalled()
				default:
					break;
			}
		}
	}
	
	owner.toast = function(msg, duration){
		var duration = duration || 'short';
		plus.nativeUI.toast(msg, {
			duration: duration,
			verticalAlign: 'center'
		});
	}
/*
	 * 余额支付
	 */
	owner.pay = function(pay_type, pay_count, remark, did, callback){
		var state = owner.getState();
		if(state){
			wistorm_api.payService(state.uid, state.adminUser, 11, pay_type, pay_count, remark, did, function(obj){
				console.log(JSON.stringify(obj));
				if(obj.status_code == 0){
					return callback();
				}else if(obj.status_code == 8196){
					return callback('余额不足，请充值后再试');
				}else{
					return callback('支付异常[code=' + obj.status_code + ']');
				}
			});	
		}else{
			return callback('出现异常，请重新登录后重试');
		}
	}		
	owner.online = true;
}(mui, window.app = {}));