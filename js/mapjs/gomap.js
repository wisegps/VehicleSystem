var select_vehicle = null;
var toolType = TOOL_TYPE_DEFAULT;
var current_marker = null;
var current_infowin = null;
var current_retangle = null;

function getTextWidth(str) {  
    var span = document.getElementById('textWidth');
    span.innerHTML = str;
    var w = span.offsetWidth;
    return w;  
}  

var gmap = function(div_map, center_point, zoom) {
    this.map = new google.maps.Map(div_map, {
        zoom: zoom,
        center: center_point,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapMaker: false,
        noClear: true,
        fullscreenControl: false,
        streetViewControl: false
    });
    this.geocoder = new google.maps.Geocoder();
    this.vehicles = [];
    this.pois = [];
    this.geos = [];
    this.markers = [];
    this.poi_markers = [];
    this.markerClusterer = null;
    this.showLocation = null;
    this.mapClick = null;
}

gmap.prototype.setCenter = function (lon, lat) {
    point = new google.maps.LatLng(lat, lon);
    this.map.setCenter(point);
};

// 获取地址后的函数处理
gmap.prototype.setShowLocation = function (fun) {
    this.showLocation = fun;
}

function vehicleMarker(vehicle, if_track, if_show_line) {
    this.obj_id = vehicle.did;
    this.obj_name = vehicle.vehicleName;
    this.lon = vehicle.activeGpsData.lon;
    this.lat = vehicle.activeGpsData.lat;
    this.speed = vehicle.activeGpsData.speed;
    this.direct = vehicle.activeGpsData.direct;
    this.if_track = if_track;
    this.if_show_line = if_show_line;
    this.track_line = null;
    this.track_lines = [];
    this.content = "";
    this.marker_ = null;
    this.infowin_ = null;
}

function poiMarker(poi) {
    this.poi_id = poi.PointID;
    this.poi_name = poi.PointName;
    this.poi_type = poi.PointType;
    this.icon = poi.Icon;
    this.lon = poi.Lon;
    this.lat = poi.Lat;
    this.remark = poi.remark;
    this.marker_ = null;
}

gmap.prototype.addVehicles = function (vehicles, is_infowin, if_playback) {
    var v = null;
    var latLng = null;
    var icon = "";
    var title = "";
    for (var i = 0; i < vehicles.length; i++) {
        if (vehicles[i] != null) {
            var v = this.vehicles[vehicles[i].did];
            // 判断车辆是否存在，存在则更新数据，不存在则添加
            if (v != null) {
                this.updateVehicle(vehicles[i], false, false, false, '#FF0000', 3, if_playback);
            } else {
                //                if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
                //                    latLng = new google.maps.LatLng(vehicles[i].active_gps_data.lat, vehicles[i].active_gps_data.lon);
                //                } else {
                	console.log('gmap - lat: ' + vehicles[i].activeGpsData.lat + ', lon: ' + vehicles[i].activeGpsData.lon);
                latLng = new google.maps.LatLng(vehicles[i].activeGpsData.lat, vehicles[i].activeGpsData.lon);
                //                }
                v = new vehicleMarker(vehicles[i], false, false);
                title = vehicles[i].vehicleName;
//              var offset = getTextWidth(title) / 2; 
//              console.log(title+","+offset);
                icon = getIcon(vehicles[i], MAP_TYPE_GOOGLE, if_playback);
                v.marker_ = new google.maps.Marker({
				    position: latLng,
				    icon: icon,
				    map: this.map,
				    title: title
//					label: {
//						fontSize: '10px',
//						fontWeight: 'normal',
//						text: title
//					}
				  });
//              v.marker_ = new MarkerWithLabel({
//                  title: title,
//                  position: latLng,
//                  icon: icon,
//                  draggable: false,
//                  raiseOnDrag: false,
//                  //map: this.map,
//                  labelContent: vehicles[i].ObjectRegNum,
//                  labelAnchor: new google.maps.Point(0, 20),
//                  labelClass: "labels", // the CSS class for the label
//                  labelStyle: { opacity: 0.75 }
//              });
				if(!if_playback){
					content = getVehicleContent(vehicles[i]);
	                //打开该车辆的信息窗体
	                var infowin = new google.maps.InfoWindow({
	                    content: content,
	                    disableAutoPan: true
	                });
	                v.infowin_ = infowin;
	
	                var fn = markerClickFunction(v);
	                google.maps.event.addListener(v.marker_, "click", fn);
	
	                google.maps.event.addListener(this.map, "click", function (e) {
	                    if (select_vehicle) {
	                        select_vehicle.infowin_.close();
	                    }
	                });	
				}
                this.vehicles[vehicles[i].did] = v;
                this.markers.push(v.marker_);
            }
        }
    }

//  if (this.markerClusterer == null) {
//      //        this.markerClusterer = new MarkerClusterer(this.map, this.markers);
//      this.markerClusterer = new MarkerClusterer(this.map, this.markers, { maxZoom: 14 });
//  } else {
//      this.markerClusterer.addMarkers(this.markers);
//  }

}

var markerClickFunction = function (v) {
    return function (e) {
        if (select_vehicle) {
            select_vehicle.infowin_.close();
        }

        v.infowin_.open(this.map, this);
        // 设置该车辆为选中车辆
        select_vehicle = v;
    };
};

// 设置地图缩放比例
gmap.prototype.setZoom = function (level) {
    this.map.setZoom(level);
};

// 更新车辆显示
gmap.prototype.updateVehicle = function (vehicle, if_track, if_show_line, if_open_win, color, width, if_playback) {
    var v = this.vehicles[vehicle.did];
    var content = "";
    if (v != null) {
        var oldlatLng;
        var oldGpsTime;
//        if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
//            oldlatLng = new google.maps.LatLng(v.lat, v.lon);
//        } else {
            oldlatLng = new google.maps.LatLng(v.lat, v.lon);
//        }
        oldGpsTime = v.gpsTime;
        v.lon = vehicle.activeGpsData.lon;
        v.lat = vehicle.activeGpsData.lat;
        v.gps_time = vehicle.activeGpsData.gpsTime;
        v.speed = vehicle.activeGpsData.speed;
        v.direct = vehicle.activeGpsData.direct;

        var latLng;
//        if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
//            latLng = new google.maps.LatLng(vehicle.active_gps_data.lat, vehicle.active_gps_data.lon);
//        } else {
            latLng = new google.maps.LatLng(vehicle.activeGpsData.lat, vehicle.activeGpsData.lon);
//        }

        var distance;
        if (v.if_show_line || if_show_line) {
            distance = calDistance(oldlatLng.lng(), oldlatLng.lat(), latLng.lng(), latLng.lat());
            if (distance < 2) {
                if (!v.track_line) {
                    var polyOptions = {
                        strokeColor: color,
                        strokeOpacity: 1.0,
                        strokeWeight: width
                    }
                    v.track_line = new google.maps.Polyline(polyOptions);
                    v.track_line.setMap(this.map);
                    var path = v.track_line.getPath();
                    path.push(oldlatLng);
                    v.track_lines.push(v.track_line);
                }
                var path = v.track_line.getPath();
                path.push(latLng);
                v.track_line.setPath(path);
            } else {
                v.track_line = null;
            }
        }
        title = v.obj_name;
//		var offset = getTextWidth(title) / 2 + 25;
        var icon = getIcon(vehicle, MAP_TYPE_GOOGLE, if_playback);
        v.marker_.setPosition(latLng);
        v.marker_.setIcon(icon);
        v.marker_.setVisible(true);
        if(!if_playback){
        		content = getVehicleContent(vehicle, if_playback, v.if_track);
        		v.infowin_.setContent(content);
        }

        if (v.if_track || if_track) {
            var bounds = this.map.getBounds();
            if (v.lon < bounds.getSouthWest().lng() || v.lon > bounds.getNorthEast().lng() ||
                v.lat < bounds.getSouthWest().lat() || v.lat > bounds.getNorthEast().lat()) {
                this.map.setCenter(latLng);
            }
        }

        if (if_open_win) {
            v.infowin_.open(this.map, v.marker_);
        }
        
		this.geocoder.geocode({ 'latLng': latLng }, function(results, status) {
			if(status == google.maps.GeocoderStatus.OK) {
				if(results[1]) {
					if(this.showLocation) {
						this.showLocation(results[0].formatted_address);
					}
				}
			} else {
				//alert("Geocoder failed due to: " + status);
			}
		});        
    }
}

gmap.prototype.findVehicle = function(obj_id, if_track, if_open_win) {
	var v = this.vehicles[obj_id];
	var content = "";
	if(v != null) {
		var latLng;
		latLng = new google.maps.LatLng(v.lat, v.lon);
		if(if_track) {
			this.map.setZoom(17);
			this.map.setCenter(latLng);
		}
		if(if_open_win) {
			if(select_vehicle) {
				select_vehicle.infowin_.close();
			}
			v.infowin_.open(this.map, v.marker_);
			select_vehicle = v;
		}
		// 获取地址
		this.geocoder.geocode({ 'latLng': new google.maps.LatLng(v.lat, v.lon) }, function(results, status) {
			if(status == google.maps.GeocoderStatus.OK) {
				if(results[1]) {
					if(this.showLocation) {
						this.showLocation(results[0].formatted_address);
					}
				}
			} else {
				//alert("Geocoder failed due to: " + status);
			}
		});
		return v;
	}
}

gmap.prototype.deleteVehicle = function (obj_id) {
    var v = this.vehicles[obj_id];
    if (v != null) {
        // 从数组中删除对象
        this.vehicles[obj_id] = null;
        v.marker_.setMap(null);
		this.markers.pop(v.marker_);
		if (v.track_line) {
			v.track_line.setMap(null);
		}
        if (v.track_lines) {
            for (var i = 0; i < v.track_lines.length; i++) {
                v.track_lines[i].setMap(null);
            }
        }
    }
}

gmap.prototype.clearVehicle = function () {
    for(var i = 0; i < this.markers.length; i++){
    		this.markers[i].setMap(null);
    }
    for(key in this.vehicles){
    		if(this.vehicles[key].track_line){
    			this.vehicles[key].track_line.setMap(null);   			
    		}
    }
    this.vehicles = [];
    this.markers = [];
}

gmap.prototype.toggleVehicle = function(id){
    var v = this.vehicles[id];
    if(v){
    		if(!v.if_track){
    			//删除其他跟踪的车辆
    			for(key in this.vehicles){
    				this.vehicles[key].if_track = false;
    			}
    		}
    		v.if_track = !v.if_track;
    		return v.if_track;
    }
}


gmap.prototype.addTrackLine = function (vehicle, gps_datas, color, width) {
    var v = this.vehicles[vehicle.did];
    var content = "";
    if (v == null) {
        v = new vehicleMarker(vehicle, false, false);
        this.vehicles[vehicle.ObjectID] = v;
    }
    var points = [];
    var latLng;
    var bounds = new google.maps.LatLngBounds();
    for (var i = 0; i < gps_datas.length; i++) {
        //        if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
        //            latLng = new google.maps.LatLng(gps_datas[i].lat, gps_datas[i].lon);
        //        } else {
        latLng = new google.maps.LatLng(gps_datas[i].lat, gps_datas[i].lon);
        //        }
        points.push(latLng);
        bounds.extend(latLng);
    }

    var polyOptions = {
        path: points,
        strokeColor: color,
        strokeOpacity: 0.7,
        strokeWeight: width
    }
    if (v.track_line) {
        v.track_line.setMap(null);
    };
    v.track_line = new google.maps.Polyline(polyOptions);
    v.track_line.setMap(this.map);
    this.map.fitBounds(bounds);
}

gmap.prototype.removeTrackLine = function (vehicle) {
    var v = this.vehicles[vehicle.ObjectID];
    var content = "";
    if (v != null && v.track_lines != null) {
        for (var i = 0; i < v.track_lines.length; i++) {
            v.track_lines[i].setMap(null);
        }
        v.track_line.setMap(null);
        v.track_line = null;
    }
}

gmap.prototype.moveTrackPoint = function (vehicle, gps_data, if_open_win) {
    var v = vehicle;
    v.active_gps_data.lon = gps_data.lon;
    v.active_gps_data.lat = gps_data.lat;
    v.active_gps_data.rev_lon = gps_data.rev_lon;
    v.active_gps_data.rev_lat = gps_data.rev_lat;
    v.active_gps_data.speed = gps_data.speed;
    v.active_gps_data.direct = gps_data.direct;
    v.active_gps_data.gps_time = gps_data.gps_time;
    v.active_gps_data.uni_status = gps_data.uni_status;
    v.active_gps_data.uni_alerts = gps_data.uni_alerts;
    this.updateVehicle(v, true, true, if_open_win, 'green', 3, true);
}

function strPad(hex) {
    var zero = '00000000';
    var tmp = 8 - hex.length;
    return zero.substr(0, tmp) + hex;
}

gmap.prototype.openAddGeoTool = function () {
    google.maps.event.addListener(this.map, 'click', function (event) {
        //alert(event.latLng);
        var lon = parseInt(event.latLng.lat() * 600000);
        var lat = parseInt(event.latLng.lng() * 600000);
        lon = strPad(lon.toString(16).toUpperCase());
        lat = strPad(lat.toString(16).toUpperCase());
        alert(lat + "," + lon);
    });
}

var onMapClick = function (map, title, div_content) {
    return function (event) {
        switch (toolType) {
            case TOOL_TYPE_POI:
                //alert("兴趣点：" + event.latLng);
                if (current_infowin) {
                    current_infowin.close();
                }
                current_infowin = new google.maps.InfoWindow({
                    content: div_content,
                    disableAutoPan: true
                });
                if (current_marker) {
                    current_marker.setMap(null);
                }
                current_marker = new google.maps.Marker({
                    position: event.latLng,
                    map: map,
                    title: title
                });
                current_infowin.open(map, current_marker);
                break;
            case TOOL_TYPE_GEO:
                //alert("矩形围栏：" + event.latLng);
                if (current_infowin) {
                    current_infowin.close();
                }
                current_infowin = new google.maps.InfoWindow({
                    content: div_content,
                    disableAutoPan: true,
                    position: event.latLng
                });
                if (current_retangle) {
                    current_retangle.setMap(null);
                }
                current_retangle = new google.maps.Rectangle({
                    strokeColor: "#FF0000",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: "#FF0000",
                    fillOpacity: 0.35,
                    map: map,
                    bounds: getRectangle(event.latLng.lng(), event.latLng.lat(), 100)
                });
                current_infowin.open(map);
                break;
            case TOOL_TYPE_POLY:
                alert("多边形围栏：" + event.latLng);
                break;
            case TOOL_TYPE_ROUTE:
                alert("线路：" + event.latLng);
                break;
        }
    }
}

gmap.prototype.setTool = function (tool_type, title, div_content, callback) {
    toolType = tool_type;
    switch (tool_type) {
        case TOOL_TYPE_DEFAULT:
            google.maps.event.removeListener(this.mapClick);
            if (current_infowin) {
                current_infowin.close();
            }
            if (current_marker) {
                current_marker.setMap(null);
            }
            break;
        case TOOL_TYPE_POI:
        case TOOL_TYPE_GEO:
        case TOOL_TYPE_POLY:
        case TOOL_TYPE_ROUTE:
            fn = onMapClick(this.map, title, div_content);
            this.mapClick = google.maps.event.addListener(this.map, 'click', fn);
            break;
    }
}

gmap.prototype.addPois = function (pois) {
    var p = null;
    var latLng = null;
    var icon = "";
    var title = "";
    for (var i = 0; i < pois.length; i++) {
        this.addPoi(pois[i]);
    }
}

gmap.prototype.addPoi = function (poi) {
    var p = null;
    var latLng = null;
    var icon = "";
    var title = "";
    var p = this.pois[poi.PointID];
    // 判断兴趣点是否存在，存在则更新数据，不存在则添加
    if (p != null) {
        this.updatePoi(poi);
    } else {
        //        if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
        //            latLng = new google.maps.LatLng(poi.lat, poi.lon);
        //        } else {
        latLng = new google.maps.LatLng(poi.Lat, poi.Lon);
        //        }
        p = new poiMarker(poi);
        var offset = getTextWidth(poi.PointName) / 2 + 25;
//      console.log(poi.PointName + "," + offset);
        icon = getPoiIcon(poi, MAP_TYPE_GOOGLE, offset);
        title = poi.PointName;
//      p.marker_ = new MarkerWithLabel({
//          title: title,
//          position: latLng,
//          icon: icon,
//          map: this.map, 
//          draggable: false,
//          raiseOnDrag: false,
//          labelContent: poi.PointName,
//          labelAnchor: new google.maps.Point(50, -10),
//          labelClass: "labels", // the CSS class for the label
//          labelStyle: { opacity: 0.75 }
//      });
		p.marker_ = new google.maps.Marker({
			position: latLng,
			icon: icon,
			map: this.map,
			title: title,
			label: {
				fontSize: '10px',
				fontWeight: 'normal',
				text: title
			}
		});
        this.pois[poi.PointID] = p;
        this.poi_markers.push(p.marker_);
    }

}

gmap.prototype.findPoi = function (poi_id) {
    var p = this.pois[poi_id];
    var content = "";
    if (p != null) {
        var latLng;
        //        if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
        //            latLng = new google.maps.LatLng(p.lat, p.lon);
        //        } else {
        latLng = new google.maps.LatLng(p.rev_lat, p.rev_lon);
        //        }
        this.map.setZoom(10);
        this.map.setCenter(latLng);
        return p;
    }

}

gmap.prototype.editPoi = function (div_content, poi_id, callback) {
    //找到对应的poi
    var p = this.pois[poi_id];
    if (p) {
        var latLng;
        //        if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
        //            latLng = new google.maps.LatLng(p.lat, p.lon);
        //        } else {
        latLng = new google.maps.LatLng(p.rev_lat, p.rev_lon);
        //        }
        this.map.setZoom(10);
        this.map.setCenter(latLng);
        current_infowin = new google.maps.InfoWindow({
            content: div_content,
            disableAutoPan: true
        });
        if (current_marker) {
            current_marker.setMap(null);
        }
        current_marker = new google.maps.Marker({
            position: p.marker_.position,
            map: this.map,
            title: p.poi_name
        });
        current_infowin.open(this.map, current_marker);
        //current_marker = p.marker_;
        this.setTool(TOOL_TYPE_POI, p.poi_name, div_content, callback);
    }
}

gmap.prototype.updatePoi = function (poi) {
    var p = this.pois[poi.PointID];
    var content = "";
    if (p != null) {
        //        if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
        //            latLng = new google.maps.LatLng(poi.lat, poi.lon);
        //        } else {
        latLng = new google.maps.LatLng(poi.Lat, poi.Lon);
        //        }
        p.poi_name = poi.PointName;
        p.poi_type = poi.PointType;
        p.lon = poi.Lon;
        p.lat = poi.Lat;
        var icon = getPoiIcon(poi, MAP_TYPE_GOOGLE);
        p.marker_.setIcon(icon);
        var latLng;
        //        if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
        //            latLng = new google.maps.LatLng(poi.lat, poi.lon);
        //        } else {
        latLng = new google.maps.LatLng(poi.Lat, poi.Lon);
        //        }
        p.marker_.setPosition(latLng);
//      p.marker_.label.marker_.labelContent = poi.poi_name;
//      p.marker_.label.setContent();
//      p.marker_.label.marker_.labelAnchor = new google.maps.Point(50, -10),
//      p.marker_.label.setAnchor();
    }
}

gmap.prototype.deletePoi = function (poi_id) {
    var p = this.pois[poi_id];
    if (p != null) {
        // 从数组中删除对象
        this.pois[poi_id] = null;
        if (p.marker_) {
            p.marker_.setMap(null);
        }
    }
}

gmap.prototype.clearPoi = function () {
    for (var i = 0; i < this.poi_markers.length; i++) {
        var m = this.poi_markers[i];
        if (m) {
            m.setMap(null);
        }
    }
    this.poi_markers = [];
    this.pois = [];
}

//lon,lat: 中心点经纬度
//meter: 半径，单位(米)
var getRectangle = function (lon, lat, meter) {
    var pi = 3.1415926535897932;
    var ranx, rany;
    var x, y;
    y = lat;
    x = 90 - y;
    x = Math.sin(x * pi / 180);
    x = 40075.38 * x;
    x = x / 360;
    x = x * 1000;
    ranx = meter / x;
    rany = meter / 110940;
    return new google.maps.LatLngBounds(
        new google.maps.LatLng(lat - rany, lon - ranx),
        new google.maps.LatLng(lat + rany, lon + ranx)
        );
}

gmap.prototype.showGeo = function (poi) {
    var latLng;
    //    if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
    //        latLng = new google.maps.LatLng(poi.lat, poi.lon);
    //    } else {
    latLng = new google.maps.LatLng(poi.rev_lat, poi.rev_lon);
    //    }
    this.map.setZoom(15);
    this.map.setCenter(latLng);
    if (current_retangle) {
        current_retangle.setMap(null);
    }
    current_retangle = new google.maps.Rectangle({
        strokeColor: "#FF0000",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#FF0000",
        fillOpacity: 0.35,
        map: this.map,
        bounds: getRectangle(latLng.lng(), latLng.lat(), poi.width)
    });
}

gmap.prototype.deleteGeo = function () {
    if (current_retangle) {
        current_retangle.setMap(null);
    }
}

//更改电子围栏宽度
gmap.prototype.changeGeoWidth = function (width) {
    if (current_retangle) {
        var bounds = getRectangle(current_retangle.getBounds().getCenter().lng(), current_retangle.getBounds().getCenter().lat(), width);
        current_retangle.setBounds(bounds);
    }
}

gmap.prototype.editGeo = function (div_content, poi, callback) {
    //找到对应的poi
    var p = poi;
    if (poi) {
        var latLng;
        //        if (this.map.getMapTypeId() == google.maps.MapTypeId.SATELLITE || this.map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
        //            latLng = new google.maps.LatLng(p.lat, p.lon);
        //        } else {
        latLng = new google.maps.LatLng(p.rev_lat, p.rev_lon);
        //        }
        this.map.setZoom(15);
        this.map.setCenter(latLng);
        current_infowin = new google.maps.InfoWindow({
            content: div_content,
            disableAutoPan: true,
            position: latLng
        });
        if (current_retangle) {
            current_retangle.setMap(null);
        }
        current_retangle = new google.maps.Rectangle({
            strokeColor: "#FF0000",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#FF0000",
            fillOpacity: 0.35,
            map: this.map,
            bounds: getRectangle(latLng.lng(), latLng.lat(), p.width)
        });
        current_infowin.open(this.map);

        this.setTool(TOOL_TYPE_GEO, p.poi_name, div_content, callback);
    }
}