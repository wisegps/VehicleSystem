		var amount = 100;
		var pay_type = 1; //1: 支付宝 2：微信
		var pays = {};

		function plusReady() {
			// 获取支付通道
			plus.payment.getChannels(function(channels) {
				for(var i in channels) {
					var channel = channels[i];
					if(channel.id == 'qhpay' || channel.id == 'qihoo') { // 过滤掉不支持的支付通道：暂不支持360相关支付
						continue;
					}
					pays[channel.id] = channel;
					checkServices(channel);
				}
			}, function(e) {
				console.log('获取支付通道失败：' + e.message);
			});
		}

		// 检测是否安装支付服务
		function checkServices(pc) {
			if(!pc.serviceReady) {
				var txt = null;
				switch(pc.id) {
					case 'alipay':
						txt = '检测到系统未安装“支付宝快捷支付服务”，无法完成支付操作，是否立即安装？';
						break;
					default:
						txt = '系统未安装“' + pc.description + '”服务，无法完成支付，是否立即安装？';
						break;
				}
				plus.nativeUI.confirm(txt, function(e) {
					if(e.index == 0) {
						pc.installService();
					}
				}, pc.description);
			}
		}

		// 支付
		function pay(type, total, content, orderType, callback) {
			var url = '';
			var channel = {};
//			var total = 0.01; //test
			var state = app.getState();
			if(type === 1) {
				url = 'http://h5.bibibaba.cn/pay/wicare/alipay/?total=' + total + '&adminUser=' + state.adminUser + '&orderType=' + orderType + '&uid=' + state.uid + '&subject=' + content + '&body=' + content;
				channel = pays['alipay'];
			} else if(type === 2) {
				url = 'http://h5.bibibaba.cn/pay/wicare/wxpayv3/?total=' + total + '&adminUser=' + state.adminUser + '&orderType=' + orderType + '&uid=' + state.uid + '&subject=' + content + '&body=' + content;
				channel = pays['wxpay']; 
			}
			console.log(url);
			var appid = plus.runtime.appid;
			if(navigator.userAgent.indexOf('StreamApp') >= 0) {
				appid = 'Stream';
			}
			w = plus.nativeUI.showWaiting();
			// 请求支付订单
			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function() {
				switch(xhr.readyState) {
					case 4:
						w.close();
						w = null;
						if(xhr.status == 200) {
							var order = xhr.responseText;
							if(order === '-1') {
								plus.nativeUI.alert('获取订单信息失败！', null, '充值');
							} else {
								console.log('order:' + JSON.stringify(order));
								console.log('chanel: ' + JSON.stringify(channel));
								plus.payment.request(channel, order, function(result) {
									callback();
								}, function(e) {
									console.log(JSON.stringify(e));
									
									if(e.message.indexOf('-1')>-1){
										plus.nativeUI.alert("充值异常！", null, '充值');
									}else if(e.message.indexOf('-2')>-1){
										plus.nativeUI.alert("您已取消充值！", null, '充值');
									}
								});
							}
						} else {
							plus.nativeUI.alert('获取订单信息失败！', null, '充值');
						}
						break;
					default:
						break;
				}
			}
			xhr.open('GET', url);
			xhr.send();
		}
		
		// 退款
		function refund(type, oid, total, content, callback) {
			var url = '';
			var channel = {};
			var total = 0.01; //test
			var state = app.getState();
			if(type === 'alipay') {
				url = 'http://h5.bibibaba.cn/wicare/pay/alipay/refund.php?total=' + total + '&uid=' + state.uid + '&refundOid=' + oid + '&refundAmount=' + total + '&refundDesc=' + content + 'body=' + content;
			} else if(type === 'wxpay') {
				url = 'http://h5.bibibaba.cn/wicare/pay/wxpayv3/refund.php?total=' + total + '&uid=' + state.uid + '&refundOid=' + oid + '&refundAmount=' + total + '&refundDesc=' + content + 'body=' + content;
			}
			w = plus.nativeUI.showWaiting();
			// 请求支付订单
			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function() {
				switch(xhr.readyState) {
					case 4:
						w.close();
						w = null;
						if(xhr.status == 200) {
							var order = xhr.responseText;
							if(order === '-1') {
								plus.nativeUI.alert('退还押金失败！', null, '退款');
							} else {
								plus.nativeUI.toast('退还押金成功。');
								callback();
							}
						} else {
							plus.nativeUI.alert('退还押金失败！', null, '退款');
						}
						break;
					default:
						break;
				}
			}
			xhr.open('GET', url);
			xhr.send();
		}