import React, { useState, useEffect } from "react";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import Drawer from "@material-ui/core/Drawer";
import MenuIcon from "@material-ui/icons/Menu";
import { Link, Route } from "react-router-dom";
import { auth, db } from "./firebase";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Radio from "@material-ui/core/Radio";
import DissatisfiedIcon from "@material-ui/icons/SentimentDissatisfied";
import SatisfiedIcon from "@material-ui/icons/SentimentSatisfied";
import VeryDissatisfiedIcon from "@material-ui/icons/SentimentVeryDissatisfied";
import VerySatisfiedIcon from "@material-ui/icons/SentimentVerySatisfied";
import { Line } from "react-chartjs-2";
var unirest = require("unirest");
var moment = require("moment");

export function App(props) {
  const [drawer_open, setDrawerOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(u => {
      if (u) {
        setUser(u);
      } else {
        props.history.push("/");
      }
    });

    return unsubscribe;
  }, [props.history]);

  const handleSignOut = () => {
    auth
      .signOut()
      .then(() => {
        props.history.push("/");
      })
      .catch(error => {
        alert(error.message);
      });
  };

  if (!user) {
    return <div />;
  }

  return (
    <div>
      <AppBar position="static" color="primary">
        <Toolbar>
          <IconButton color="inherit" onClick={() => setDrawerOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            color="inherit"
            style={{ flexGrow: 1, marginLeft: "30px" }}
          >
            Health Tracker
          </Typography>
          <Typography color="inherit" style={{ marginRight: "30px" }}>
            H! {user.email}
          </Typography>
          <Button color="inherit" onClick={handleSignOut}>
            Sign out
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer
        open={drawer_open}
        onClose={() => {
          setDrawerOpen(false);
        }}
      >
        <List>
          <ListItem
            button
            to="/app/"
            component={Link}
            onClick={() => {
              setDrawerOpen(false);
            }}
          >
            <ListItemText primary="Take Survey" />
          </ListItem>
          <ListItem
            button
            to="/app/charts/"
            component={Link}
            onClick={() => {
              setDrawerOpen(false);
            }}
          >
            <ListItemText primary="Chart" />
          </ListItem>
        </List>
      </Drawer>
      <Route
        exact
        path="/app/"
        render={routeProps => {
          return (
            <Survey
              user={user}
              match={routeProps.match}
              location={routeProps.location}
              history={routeProps.history}
            />
          );
        }}
      />
      <Route
        exact
        path="/app/charts"
        render={routeProps => {
          return (
            <Charts
              user={user}
              match={routeProps.match}
              location={routeProps.location}
              history={routeProps.history}
            />
          );
        }}
      />
    </div>
  );
}

function Survey(props) {
  const [radioValue, setRadioValue] = useState(3);
  const [sleep, setSleep] = useState(8);
  const [temp, setTemp] = useState(70);
  const [lat, setLat] = useState(44);
  const [long, setLong] = useState(-111);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude;
      const long = position.coords.longitude;
      setLat(lat);
      setLong(long);
    });
  }, []);

  useEffect(() => {
    var req = unirest(
      "GET",
      `https://community-open-weather-map.p.rapidapi.com/weather?lat=${lat}&lon=${long}&units=imperial`
    );

    req.headers({
      "x-rapidapi-host": "community-open-weather-map.p.rapidapi.com",
      "x-rapidapi-key": "d2b10d0028msh4ba1c30feded6fap1dc0e2jsna8683caf97aa"
    });

    req.end(function(result) {
      if (result.error) throw new Error(result.error);
      setTemp(result.body.main.temp);
    });
    return;
  }, [lat, long]);

  const handleSave = () => {
    let today = new Date();
    today = moment(today).format("YYYY-MM-DD HH:mm");
    db.collection("users")
      .doc(props.user.uid)
      .collection("surveys")
      .add({ temp: temp, hapiness: radioValue, sleep: sleep, date: today })
      .then(() => {
        props.history.push("/app/charts/");
      });
  };

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <Paper style={{ padding: 30, width: 400, marginTop: 30 }}>
        <Typography>How many hours did you sleep last night?</Typography>
        <TextField
          fullWidth
          value={sleep}
          onChange={e => {
            setSleep(e.target.value);
          }}
        />
        <Typography style={{ marginTop: 20 }}>
          How happy do you feel today?
        </Typography>
        <div>
          <Radio
            icon={<VeryDissatisfiedIcon />}
            checkedIcon={<VeryDissatisfiedIcon />}
            checked={radioValue === 1}
            onChange={() => {
              setRadioValue(1);
            }}
          />
          <Radio
            icon={<DissatisfiedIcon />}
            checkedIcon={<DissatisfiedIcon />}
            checked={radioValue === 2}
            onChange={() => {
              setRadioValue(2);
            }}
          />
          <Radio
            icon={<SatisfiedIcon />}
            checkedIcon={<SatisfiedIcon />}
            checked={radioValue === 3}
            onChange={() => {
              setRadioValue(3);
            }}
          />
          <Radio
            icon={<VerySatisfiedIcon />}
            checkedIcon={<VerySatisfiedIcon />}
            checked={radioValue === 4}
            onChange={() => {
              setRadioValue(4);
            }}
          />
        </div>
        <Button
          variant="contained"
          color="primary"
          style={{ marginTop: 20 }}
          onClick={handleSave}
        >
          Save
        </Button>
      </Paper>
    </div>
  );
}

function Charts(props) {
  const [temp, setTemp] = useState([]);
  const [hapiness, setHapiness] = useState([]);
  const [sleep, setSleep] = useState([]);

  useEffect(() => {
    const unsubscribe = db
      .collection("users")
      .doc(props.user.uid)
      .collection("surveys")
      .onSnapshot(snapshot => {
        const temp_array = [];
        const hapiness_array = [];
        const sleep_array = [];

        snapshot.forEach(s => {
          const data = s.data();
          temp_array.push({ x: data.date, y: data.temp });
          hapiness_array.push({ x: data.date, y: data.hapiness });
          sleep_array.push({ x: data.date, y: data.sleep });
        });
        setTemp(temp_array);
        setHapiness(hapiness_array);
        setSleep(sleep_array);
      });
    return unsubscribe;
  }, [props.user]);

  const data = {
    datasets: [
      {
        label: "Tempurature",
        data: temp,
        borderColor: ["green"],
        yAxisID: "A"
      },
      {
        label: "Sleep",
        data: sleep,
        borderColor: ["blue"],
        yAxisID: "B"
      },
      {
        label: "Hapiness",
        data: hapiness,
        borderColor: ["red"]
      }
    ]
  };
  const options = {
    scales: {
      yAxes: [{ id: "A", position: "left" }, { id: "B", position: "right" }],
      xAxes: [{ type: "time", time: { displayFormats: { hour: "MMM D" } } }]
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <Paper style={{ width: 600, marginTop: 30, padding: 30 }}>
        <Typography variant="H6" style={{ marginBottom: 30 }}>
          Health Stats over Time
        </Typography>
        <Line data={data} options={options} />
      </Paper>
    </div>
  );
}
