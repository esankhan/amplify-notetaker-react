import React, { Component } from "react";
import { API, graphqlOperation, Auth } from "aws-amplify";
import { withAuthenticator } from "aws-amplify-react";
import { createTodo, deleteTodo, updateTodo } from "./graphql/mutations";
import {
  onCreateTodo,
  onDeleteTodo,
  onUpdateTodo
} from "./graphql/subscriptions";

import { listTodos } from "./graphql/queries";

class App extends Component {
  state = {
    id: "",
    note: "",
    notes: []
  };

  getUser = async () => {
    const user = await Auth.currentUserInfo();
    return user;
  };

  async componentDidMount() {
    this.getNotes();
    this.createNoteListener = this.getUser().then(user => {
      return API.graphql(
        graphqlOperation(onCreateTodo, {
          owner: user.username
        })
      ).subscribe({
        next: noteData => {
          const newNote = noteData.value.data.onCreateTodo;
          const prevNotes = this.state.notes.filter(
            note => note.id !== newNote.id
          );
          const updatedNotes = [...prevNotes, newNote];
          this.setState({ notes: updatedNotes });
        }
      });
    });
    this.deleteNoteListener = this.getUser().then(user => {
      return API.graphql(
        graphqlOperation(onDeleteTodo, {
          owner: user.username
        })
      ).subscribe({
        next: noteData => {
          const deletedNote = noteData.value.data.onDeleteTodo;
          const updatedNotes = this.state.notes.filter(
            note => note.id !== deletedNote.id
          );
          this.setState({ notes: updatedNotes });
        }
      });
    });

    this.updateNoteListener = this.getUser().then(user => {
      return API.graphql(
        graphqlOperation(onUpdateTodo, {
          owner: user.username
        })
      ).subscribe({
        next: noteData => {
          const { notes } = this.state;
          const updatedNote = noteData.value.data.onUpdateTodo;
          const index = notes.findIndex(note => note.id === updatedNote.id);
          const updatedNotes = [
            ...notes.slice(0, index),
            updatedNote,
            ...notes.slice(index + 1)
          ];

          this.setState({ notes: updatedNotes, note: "", id: "" });
        }
      });
    });
  }

  componentWillUnmount() {
    return this.createNoteListener.unsubscribe;
  }

  getNotes = async () => {
    const result = await API.graphql(graphqlOperation(listTodos));
    this.setState({ notes: result.data.listTodos.items });
  };

  handleChange = event => this.setState({ note: event.target.value });

  handleSubmit = async event => {
    event.preventDefault();
    const { note } = this.state;
    if (note === "") {
      alert("Enter valid note");
      return;
    }
    //Check for existing nodes
    if (this.hasExistingNote()) {
      //Update Note

      this.handleUpdateNode();
    } else {
      const input = { note };
      await API.graphql(graphqlOperation(createTodo, { input }));

      this.setState({ note: "" });
    }
  };

  handleDeleteNote = async noteId => {
    const input = { id: noteId };

    await API.graphql(graphqlOperation(deleteTodo, { input }));
  };

  handleSetNode = ({ id, note }) => this.setState({ id, note });

  hasExistingNote = () => {
    const { id, notes } = this.state;

    if (id) {
      const isNote = notes.findIndex(note => note.id === id) > -1;
      return isNote;
    }
    return false;
  };

  handleUpdateNode = async () => {
    const { id, note } = this.state;
    const input = { id, note };
    await API.graphql(graphqlOperation(updateTodo, { input }));
  };

  render() {
    const { note, notes, id } = this.state;
    return (
      <div className='flex flex-column items-center justify-center pa3 bg-washed-red'>
        <h1 className='code f2-1'>Amplify Note-Taker</h1>

        {/* Note Form */}
        <form className='mb3' onSubmit={this.handleSubmit}>
          <input
            type='text'
            className='pa2 f4'
            placeholder='write your note'
            onChange={this.handleChange}
            value={note}
          />

          <button className='pa2 f4' type='submit'>
            {id ? "Update Note" : "Add Note"}
          </button>
        </form>
        {/* Notes List */}
        <div>
          {notes.map(item => (
            <div key={item.id} className='flex item-center'>
              <li
                onClick={() => this.handleSetNode(item)}
                className='list pa1 f3'
              >
                {item.note}
              </li>
              <button
                onClick={() => this.handleDeleteNote(item.id)}
                className='bg-transparent bn f4'
              >
                <span>&times;</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

export default withAuthenticator(App, { includeGreetings: true });
