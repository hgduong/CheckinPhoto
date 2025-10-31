import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, TextInput, ScrollView } from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";

const rawUserList = [
  {
    id: "u1",
    name: "Nguyễn Văn A",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    postCount: 3,
    photo: "https://i.imgur.com/efgh456.jpg",
    location: "Hoàn Kiếm",
    latitude: 21.0285,
    longitude: 105.8542,
  },
  {
    id: "u2",
    name: "Trần Thị B",
    avatar: "https://randomuser.me/api/portraits/women/65.jpg",
    postCount: 5,
    photo: "https://i.imgur.com/ghij789.jpg",
    location: "Ba Đình",
    latitude: 21.0330,
    longitude: 105.8380,
  },
  {
    id: "u3",
    name: "Lê Văn C",
    avatar: "https://randomuser.me/api/portraits/men/45.jpg",
    postCount: 4,
    photo: "https://i.imgur.com/ghij789.jpg",
    location: "Ba Đình",
    latitude: 21.0250,
    longitude: 105.8380,
  },
  
  {
    id: "u4",
    name: "Phạm Thị D",
    avatar: "https://randomuser.me/api/portraits/women/12.jpg",
    postCount: 4,
    photo: "https://i.imgur.com/ghij789.jpg",
    location: "Cầu Giấy",
    latitude: 21.0250,
    longitude: 105.7913,
  },
  {
    id: "u5",
    name: "Nguyễn Văn E",
    avatar: "https://randomuser.me/api/portraits/men/33.jpg",
    postCount: 4,
    photo: "https://i.imgur.com/ghij789.jpg",
    location: "Cầu Giấy",
    latitude: 21.0200,
    longitude: 105.7933,
  },
  {
    id: "u6",
    name: "Trần Thị F",
    avatar: "https://randomuser.me/api/portraits/women/66.jpg",
    postCount: 3,
    photo: "https://i.imgur.com/efgh456.jpg",
    location: "Hoàn Kiếm",
    latitude: 21.0205,
    longitude: 105.8541,
  },
  {
  id: "u7",
  name: "Nguyễn Văn G",
  avatar: "https://randomuser.me/api/portraits/men/50.jpg",
  postCount: 3,
  photo: "https://i.imgur.com/abcd123.jpg",
  location: "Cầu Giấy",
  latitude: 21.0309,
  longitude: 105.8013,
},
{
  id: "u8",
  name: "Lê Văn H",
  avatar: "https://randomuser.me/api/portraits/men/51.jpg",
  postCount: 2,
  photo: "https://i.imgur.com/efgh456.jpg",
  location: "Kim Mã",
  latitude: 21.0310,
  longitude: 105.8265,
},
{
  id: "u9",
  name: "Phạm Thị I",
  avatar: "https://randomuser.me/api/portraits/women/33.jpg",
  postCount: 4,
  photo: "https://i.imgur.com/ghij789.jpg",
  location: "Kim Mã",
  latitude: 21.0295,
  longitude: 105.8235,
},
  
 
];

export default function MapScreen() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  useEffect(() => {
    setUsers(rawUserList);
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchName = user.name.toLowerCase().includes(search.toLowerCase());
    const matchLocation = filterLocation ? user.location === filterLocation : true;
    return matchName && matchLocation;
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchBar}>
        <TextInput
          placeholder="🔍 Tìm kiếm người dùng..."
          value={search}
          onChangeText={setSearch}
          style={styles.input}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {["", "Hoàn Kiếm", "Ba Đình", "Cầu Giấy", "Kim Mã"].map((loc) => (
            <Text
              key={loc}
              style={[
                styles.filterButton,
                filterLocation === loc && styles.activeFilter,
              ]}
              onPress={() => setFilterLocation(loc)}
            >
              {loc || "Tất cả"}
            </Text>
          ))}
        </ScrollView>
      </View>

      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 21.0285,
          longitude: 105.8542,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
      >
        {filteredUsers.map((user) => (
          <Marker
            key={user.id}
            coordinate={{ latitude: user.latitude, longitude: user.longitude }}
          >
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.username}>{user.name}</Text>
                <Image source={{ uri: user.photo }} style={styles.photo} />
                <Text>Số bài đăng: {user.postCount}</Text>
                <Text>Khu vực: {user.location}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    marginTop: 25,
    padding: 10,
    backgroundColor: "#fff",
    elevation: 2,
  },
  input: {
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: "row",
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#eee",
    borderRadius: 20,
    marginRight: 8,
    fontSize: 14,
  },
  activeFilter: {
    backgroundColor: "#2196F3",
    color: "#fff",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
  },
  callout: {
    width: 200,
    padding: 5,
  },
  username: {
    fontWeight: "bold",
    marginBottom: 5,
  },
  photo: {
    width: "100%",
    height: 100,
    borderRadius: 8,
    marginBottom: 5,
  },
});

// import React, { useEffect, useState } from "react";
// import { View, Text, Image, StyleSheet } from "react-native";
// import MapView, { Marker, Callout } from "react-native-maps";

// // Dữ liệu giả lập người dùng
// const userList = [
//   { id: "u1", name: "Nguyễn Văn A", avatar: "https://randomuser.me/api/portraits/men/32.jpg", latitude: 21.0285, longitude: 105.8542 },
//   { id: "u2", name: "Trần Thị B", avatar: "https://randomuser.me/api/portraits/women/65.jpg", latitude: 21.0300, longitude: 105.8500 },
//   { id: "u3", name: "Lê Văn C", avatar: "https://randomuser.me/api/portraits/men/45.jpg", latitude: 21.0200, longitude: 105.8520 },
//   { id: "u4", name: "Phạm Thị D", avatar: "https://randomuser.me/api/portraits/women/12.jpg", latitude: 21.0290, longitude: 105.8560 },
//   { id: "u5", name: "Nguyễn Văn E", avatar: "https://randomuser.me/api/portraits/men/33.jpg", latitude: 21.0260, longitude: 105.8490 },
//   { id: "u6", name: "Trần Thị F", avatar: "https://randomuser.me/api/portraits/women/66.jpg", latitude: 21.0290, longitude: 105.8510 },
//   { id: "u7", name: "Trần Thị G", avatar: "https://randomuser.me/api/portraits/women/22.jpg", latitude: 21.0090, longitude: 105.8395 },
// ];

// export default function MapScreen() {
//   const [users, setUsers] = useState([]);

//   useEffect(() => {
//     // Giả lập lấy dữ liệu người dùng public
//     setUsers(userList);
//   }, []);

//   return (
//     <MapView
//       style={{ flex: 1 }}
//       initialRegion={{
//         latitude: 21.0285,
//         longitude: 105.8542,
//         latitudeDelta: 0.01,
//         longitudeDelta: 0.01,
//       }}
//     >
//       {users.map((user) => (
//         <Marker
//           key={user.id}
//           coordinate={{ latitude: user.latitude, longitude: user.longitude }}
//         >
//           <Image source={{ uri: user.avatar }} style={styles.avatar} />
//           <Callout>
//             <View style={styles.callout}>
//               <Text style={styles.username}>{user.name}</Text>
//               <Image source={{ uri: user.avatar }} style={styles.largeAvatar} />
//               <Text>Số bài đăng: {user.postCount}</Text>
//             </View>
//           </Callout>
//         </Marker>
//       ))}
//     </MapView>
//   );
// }

// const styles = StyleSheet.create({
//   avatar: {
//     width: 35,
//     height: 35,
//     borderRadius: 20,
//   },
//   largeAvatar: {
//     width: "100%",
//     height: 100,
//     borderRadius: 8,
//     marginBottom: 5,
//   },
//   callout: {
//     width: 200,
//     padding: 5,
//   },
//   username: {
//     fontWeight: "bold",
//     marginBottom: 5,
//   },
// });
