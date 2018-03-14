const React = require('react')
const {Component} = React
const {Image, StyleSheet, Text, View} = require('react-native')

const Link = (props) => <Text {...props} accessibilityRole="link" style={StyleSheet.compose(styles.link, props.style)} />

class Blink extends Component {
  constructor(props) {
    super(props)
    this.state = {isShowingText: true}

    setInterval(() => {
      this.setState(previousState => {
        return {
          isShowingText: !previousState.isShowingText
        }
      })
    }, 1000)
  }

  render() {
    const display = this.state.isShowingText ? this.props.text : ' ';
    return (
      <Text>{display}</Text>
    )
  }
}

class Greeting extends Component {
  render() {
    return (
      <Text>Hello {this.props.name}!</Text>
    );
  }
}

class App extends Component {
  render() {
    const pic = {
      uri: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Bananavarieties.jpg'
    }
    return (
      <View style={styles.app}>
        <Text>Hello world!</Text>
        <Image source={pic} style={{width: 193, height: 110}}/>
        <Greeting name='Rexxar' />
        <Greeting name='Jaina' />
        <Greeting name='Valeera' />
        <Blink text='I love to blink' />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  app: {
    // marginHorizontal: 'auto',
    // maxWidth: 500,
    alignItems: 'center',
    marginTop: 200
  },
  logo: {
    height: 80
  },
  header: {
    padding: 20
  },
  title: {
    fontWeight: 'bold',
    fontSize: '1.5rem',
    marginVertical: '1em',
    textAlign: 'center'
  },
  text: {
    lineHeight: '1.5em',
    fontSize: '1.125rem',
    marginVertical: '1em',
    textAlign: 'center'
  },
  link: {
    color: '#1B95E0'
  },
  code: {
    fontFamily: 'monospace, monospace'
  }
});

export default App;