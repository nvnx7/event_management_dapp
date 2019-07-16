import React, { Component } from "react";
import EventManagementContract from "./contracts/EventManagement.json";
import getWeb3 from "./utils/getWeb3";
import getDataFromBuffer from "./utils/getDataFromBuffer";

import "./App.css";

import { Events } from './Events.js';
import { EventInfo } from './EventInfo.js';
import { EventForm } from './EventForm.js';

const VIEW_MODE_EVENTS_LIST = 'events_list';
const VIEW_MODE_EVENT_INFO = 'event_info';
const VIEW_MODE_EVENT_FORM = 'event_form';

const FIELD_ID = 0;
const FIELD_TITLE = 1;
const FIELD_DESCRIPTION = 2;
const FIELD_TICKETS_AVAILABLE = 3;
const FIELD_TICKET_PRICE = 4;
const FIELD_IS_OPEN = 5;

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      storageValue: 0,
      web3: null,
      accounts: null,
      contract: null,

      loginAddress: "0x0000000000000000000000000000000000000000",
      inputNoOfTickets: "",
      inputEventTitle: "",
      inputEventTicketsCount: "",
      inputEventTicketPrice: "",
      inputEventDescription: "",

      viewMode: VIEW_MODE_EVENTS_LIST,
      selectedEventId: 0,

      events: {}
    };

    this.handleNoOfTicketsChange = this.handleNoOfTicketsChange.bind(this);
    this.buyTickets = this.buyTickets.bind(this);
    this.goBackToEvents = this.goBackToEvents.bind(this);
    this.showEventInfo = this.showEventInfo.bind(this);
    this.showAddEventForm = this.showAddEventForm.bind(this);
    this.handleEventTitleChange = this.handleEventTitleChange.bind(this);
    this.handleEventTicketsCountChange = this.handleEventTicketsCountChange.bind(this);
    this.handleEventTicketPriceChange = this.handleEventTicketPriceChange.bind(this);
    this.handleEventDescriptionChange = this.handleEventDescriptionChange.bind(this);
    this.addEvent = this.addEvent.bind(this);
  }

  componentDidMount = async () => {
    console.log("componentDidMount called.");
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = EventManagementContract.networks[networkId];
      const instance = new web3.eth.Contract(
        EventManagementContract.abi,
        deployedNetwork && deployedNetwork.address,
      );

      const eventsData = await instance.methods.getEventsData().call();
      const eventIds = eventsData[FIELD_ID];
      const titlesBuffer = eventsData[FIELD_TITLE];
      const titles = getDataFromBuffer(titlesBuffer);
      const descriptionsBuffer = eventsData[FIELD_DESCRIPTION];
      const descriptions = getDataFromBuffer(descriptionsBuffer);
      const ticketsAvailabilities = eventsData[FIELD_TICKETS_AVAILABLE];
      const ticketsPrices = eventsData[FIELD_TICKET_PRICE];
      const areOpen = eventsData[FIELD_IS_OPEN];

      let events = {}
      for (let i = 0; i < eventIds.length; i++) {
        events[eventIds[i]] = {
          title: titles[i],
          description: descriptions[i],
          ticketsAvailable: ticketsAvailabilities[i],
          ticketPrice: ticketsPrices[i],
          isOpen: areOpen[i]
        };
      }

      // Set state
      this.setState({
       web3,
       accounts,
       contract: instance,
       loginAddress: accounts[0],
       events
      });

    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  handleNoOfTicketsChange(event) {
    console.log("handleNoOfTicketsChange value: ", event.target.value);
    this.setState({
      inputNoOfTickets: event.target.value
    });
  }

  buyTickets(event) {
    event.preventDefault();
    if (this.state.inputNoOfTickets == 0) {
      return;
    }
    console.log("buyTickets noOfTickets: ", this.state.inputNoOfTickets);
    let balance = 0;
    this.state.web3.eth.getBalance(this.state.accounts[0])
    .then((result) => {
      balance = result;
    });

    console.log("account balance: ", balance);
    this.state.contract.methods.buyTickets(this.state.selectedEventId, this.state.inputNoOfTickets)
    .send({from: this.state.accounts[0], value: 10000000000000000}) //TODO Determine value programmatically.
    .on('receipt', (receipt) => {
      const eventId = receipt.events.LogBuyTickets.returnValues['id'];
      const numTickets = receipt.events.LogBuyTickets.returnValues['numTickets'];

      let newEventsList = Object.assign({}, this.state.events);
      newEventsList[eventId].ticketsAvailable -= numTickets;

      this.setState({
        inputNoOfTickets: "",
        events: newEventsList
      });

      alert(numTickets + " ticket(s) successfully bought!");
    });
  }

  goBackToEvents() {
    this.setState({
      viewMode: VIEW_MODE_EVENTS_LIST,
      inputNoOfTickets: "",
      inputEventTitle: "",
      inputEventTicketsCount: "",
      inputEventTicketPrice: "",
      inputEventDescription: ""
    });
  }

  showEventInfo(event) {
    console.log("showEventInfo id: ", event.target.id);
    this.setState({
      selectedEventId: event.target.id,
      viewMode: VIEW_MODE_EVENT_INFO
    });
  }

  showAddEventForm(event) {
    console.log("showAddEventForm");
    this.setState({
      viewMode: VIEW_MODE_EVENT_FORM
    });
  }

  handleEventTitleChange(event) {
    //console.log("handleEventTitleChange value: ", event.target.value);
    this.setState({
      inputEventTitle: event.target.value
    });
  }

  handleEventTicketsCountChange(event) {
    //console.log("handleEventTicketsCountChange value: ", event.target.value);
    this.setState({
      inputEventTicketsCount: event.target.value
    });
  }

  handleEventTicketPriceChange(event) {
    //console.log("handleEventTicketPriceChange value: ", event.target.value);
    this.setState({
      inputEventTicketPrice: event.target.value
    });
  }

  handleEventDescriptionChange(event) {
    //console.log("handleEventDescriptionChange value: ", event.target.value);
    this.setState({
      inputEventDescription: event.target.value
    });
  }

  addEvent = async(event) => {
    console.log("addEvent");
    event.preventDefault();
    //console.log("description: ", this.state.inputEventDescription);
    await this.state.contract.methods.addEvent(
      this.state.inputEventTitle,
      this.state.inputEventDescription,
      this.state.inputEventTicketPrice,
      this.state.inputEventTicketsCount
    ).send({from: this.state.accounts[0]})
    .on('receipt', (receipt) => {
      //console.log("receit", receit);
      const id = receipt.events.LogEventAdded.returnValues['id'];
      const title = receipt.events.LogEventAdded.returnValues['title'];
      const description = receipt.events.LogEventAdded.returnValues['desc'];
      const ticketPrice = receipt.events.LogEventAdded.returnValues['ticketPrice'];
      const ticketsAvailable = receipt.events.LogEventAdded.returnValues['ticketsAvailable'];
      const isOpen = true; // by default

      console.log("EventInfo: ", id + ", " + title + ", " + description + ", " + ticketPrice + ", " + ticketsAvailable + ", " + isOpen);
      let newEventsList = Object.assign({}, this.state.events);
      newEventsList[id] = {
        title: title,
        description: description,
        ticketPrice: ticketPrice,
        ticketsAvailable: ticketsAvailable,
        isOpen: isOpen
      };

      this.setState({
        events: newEventsList
      });

      this.goBackToEvents();

      alert("Event Added!");
    })
    .on('error', (error) => {
      console.log("Error occurred: ", error);
    })
  }


  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }

    let renderComponent;
    if (this.state.viewMode == VIEW_MODE_EVENTS_LIST) {
      renderComponent = (
        <Events
          eventsList={this.state.events}
          showEventInfo={this.showEventInfo}
          showAddEventForm={this.showAddEventForm}/>
      );
    } else if (this.state.viewMode == VIEW_MODE_EVENT_INFO) {
      renderComponent = (
        <EventInfo
          event={this.state.events[this.state.selectedEventId]}
          handleNoOfTicketsChange={this.handleNoOfTicketsChange}
          buyTickets={this.buyTickets}
          goBackToEvents={this.goBackToEvents}/>
      );
    } else {
      renderComponent = (
        <EventForm
          inputEventTitle={this.state.inputEventTitle}
          inputEventTicketsCount={this.state.inputEventTicketsCount}
          inputEventTicketPrice={this.state.inputEventTicketPrice}
          inputEventDescription={this.state.inputEventDescription}
          handleEventTitleChange={this.handleEventTitleChange}
          handleEventTicketsCountChange={this.handleEventTicketsCountChange}
          handleEventTicketPriceChange={this.handleEventTicketPriceChange}
          handleEventDescriptionChange={this.handleEventDescriptionChange}
          addEvent={this.addEvent}
          goBackToEvents={this.goBackToEvents}/>
      );
    }

    return (
      <div className="wrapper">
        <div id="appTitle">Event Management</div>
        <div className="container">
          <div id="userLoginAddress">
            {this.state.loginAddress}
          </div>
          {renderComponent}
        </div>
      </div>
    );
  }
}

export default App;
