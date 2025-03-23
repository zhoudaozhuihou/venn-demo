import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Typography, AppBar, Toolbar } from '@material-ui/core';
import RelationshipGraph from './components/RelationshipGraph';
import './App.css';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(0),
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  graphContainer: {
    flexGrow: 1,
    overflow: 'hidden',
    padding: 0,
    margin: 0,
    height: '100%',
  },
  title: {
    flexGrow: 1,
  }
}));

function App() {
  const classes = useStyles();
  
  return (
    <div className={classes.root}>
      <AppBar position="static" className={classes.appBar}>
        <Toolbar>
          <Typography variant="h6" className={classes.title}>
            Data Relationship Visualization
          </Typography>
        </Toolbar>
      </AppBar>
      <main className={classes.content}>
        <div className={classes.graphContainer}>
          <RelationshipGraph />
        </div>
      </main>
    </div>
  );
}

export default App;
