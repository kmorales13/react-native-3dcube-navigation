import React from 'react';
import PropTypes from 'prop-types';
import {
	PanResponder,
	Animated,
	Dimensions,
	StyleSheet,
	Platform
} from 'react-native';
const { width, height } = Dimensions.get('window');

const PESPECTIVE = Platform.OS === 'ios' ? 2.38 : 1.7;
const TR_POSITION = Platform.OS === 'ios' ? 2 : 1.5;

const getChildrenArray = (children) => {
	const childrenArray = children && children.length ? children : [children];
	return childrenArray.filter((child) => !!child);
};

export default class CubeNavigationHorizontal extends React.PureComponent {
	constructor(props) {
		super(props);

		const children = getChildrenArray(props.children);

		this.pages = children.map((child, index) => width * -index);

		this.state = {
			currentPageIndex: 0,
			scrollLockPage: this.pages[this.props.scrollLockPage]
		};
	}

	componentWillMount() {
		this._animatedValue = new Animated.ValueXY();
		this._animatedValue.setValue({ x: 0, y: 0 });
		this._value = { x: 0, y: 0 };

		this._animatedValue.addListener((value) => {
			this._value = value;
		});

		this._panResponder = PanResponder.create({
			onMoveShouldSetResponderCapture: () => true,
			onMoveShouldSetResponderCapture: () => Math.abs(gestureState.dx) > 60,
			onMoveShouldSetPanResponderCapture: (evt, gestureState) =>
				Math.abs(gestureState.dx) > 60,
			onPanResponderGrant: (e, gestureState) => {
				this._animatedValue.stopAnimation();
				this._animatedValue.setOffset({ x: this._value.x, y: this._value.y });
			},
			onPanResponderMove: (e, gestureState) => {
				Animated.event([null, { dx: this._animatedValue.x }])(e, gestureState);

				// Avoid last movement
				this.lockLast =
					this.state.scrollLockPage != undefined
						? -this.state.scrollLockPage
						: this.pages[this.pages.length - 1];
				if (this._value.x > this.pages[0] || this._value.x < this.lockLast) {
					this._animatedValue.setValue({ x: 0, y: 0 });
				}
			},
			onPanResponderRelease: (e, gestureState) => {
				const { currentPageIndex } = this.state;
				const mod = gestureState.dx > 0 ? 100 : -100;
				const { ans: goTo, pageIndex } = this._closest(this._value.x + mod);

				if (this.lockLast > goTo) return; //remove in the future

				this._animatedValue.flattenOffset({
					x: this._value.x,
					y: this._value.y
				});

				if (currentPageIndex !== pageIndex) {
					this.props.onBeforePageChange(pageIndex);
				}

				Animated.spring(this._animatedValue, {
					toValue: { x: goTo, y: 0 },
					friction: 3,
					tension: 0.6,
					useNativeDriver: true
				}).start(() => {
					if (currentPageIndex !== pageIndex) {
						this.setState({ currentPageIndex: pageIndex }, () => {
							this.props.onPageChange(pageIndex);
						});
					}
				});
			}
		});
	}

	componentWillReceiveProps(props) {
		this.setState({
			scrollLockPage: props.scrollLockPage
				? this.pages[props.scrollLockPage]
				: undefined
		});
	}

	/*
    @page: index
  */
	scrollTo = (index, animated = true) => {
		const pageWidth = this.pages[index];

		if (pageWidth == null && typeof pageWidth !== 'number') {
			return;
		}

		if (animated) {
			Animated.spring(this._animatedValue, {
				toValue: { x: pageWidth, y: 0 },
				friction: 4,
				tension: 0.8,
				useNativeDriver: true
			}).start();
		} else {
			this._animatedValue.setValue({ x: pageWidth, y: 0 });
		}
	};

	/*
  Private methods
  */

	_getTransformsFor = (i) => {
		let scrollX = this._animatedValue.x;
		let pageX = -width * i;

		let translateX = scrollX.interpolate({
			inputRange: [pageX - width, pageX, pageX + width],
			outputRange: [(-width - 1) / TR_POSITION, 0, (width + 1) / TR_POSITION],
			extrapolate: 'clamp'
		});

		let rotateY = scrollX.interpolate({
			inputRange: [pageX - width, pageX, pageX + width],
			outputRange: ['-60deg', '0deg', '60deg'],
			extrapolate: 'clamp'
		});

		let translateXAfterRotate = scrollX.interpolate({
			inputRange: [pageX - width, pageX, pageX + width],
			inputRange: [
				pageX - width,
				pageX - width + 0.1,
				pageX,
				pageX + width - 0.1,
				pageX + width
			],
			outputRange: [
				-width - 1,
				(-width - 1) / PESPECTIVE,
				0,
				(width + 1) / PESPECTIVE,
				+width + 1
			],
			extrapolate: 'clamp'
		});

		let opacity = scrollX.interpolate({
			inputRange: [
				pageX - width,
				pageX - width + 10,
				pageX,
				pageX + width - 250,
				pageX + width
			],
			outputRange: [0, 0.6, 1, 0.6, 0],
			extrapolate: 'clamp'
		});

		return {
			transform: [
				{ perspective: width },
				{ translateX },
				{ rotateY: rotateY },
				{ translateX: translateXAfterRotate }
			],
			opacity: opacity
		};
	};

	_renderChild = (child, i) => {
		let expandStyle = this.props.expandView
			? { paddingTop: 100, paddingBottom: 100, height: height + 200 }
			: { width, height };
		let style = [child.props.style, expandStyle];
		let props = {
			i,
			style
		};
		let element = React.cloneElement(child, props);

		return (
			<Animated.View
				style={[
					StyleSheet.absoluteFill,
					{ backgroundColor: 'transparent' },
					this._getTransformsFor(i)
				]}
				key={`child- ${i}`}
			>
				{element}
			</Animated.View>
		);
	};

	_closest = (num) => {
		let array = this.pages;

		let i = 0;
		let pageIndex;
		let minDiff = 1000;
		let ans;

		for (i in array) {
			let m = Math.abs(num - array[i]);
			if (m < minDiff) {
				minDiff = m;
				ans = array[i];
				pageIndex = i;
			}
		}

		return { ans, pageIndex };
	};

	render() {
		const { expandView, children } = this.props;
		const childrenArray = getChildrenArray(children);
		const expandStyle = expandView
			? { top: -100, left: 0, width, height: height + 200 }
			: { width, height };

		return (
			<Animated.View
				style={[{ position: 'absolute' }]}
				ref={(view) => {
					this._scrollView = view;
				}}
				{...this._panResponder.panHandlers}
			>
				<Animated.View
					style={[
						{ backgroundColor: '#000', position: 'absolute', width, height },
						expandStyle
					]}
				>
					{childrenArray.map(this._renderChild)}
				</Animated.View>
			</Animated.View>
		);
	}
}

CubeNavigationHorizontal.propTypes = {
	onPageChange: PropTypes.func,
	onBeforePageChange: PropTypes.func,
	scrollLockPage: PropTypes.number,
	expandView: PropTypes.bool
};

CubeNavigationHorizontal.defaultProps = {
	expandView: false,
	onPageChange: () => {},
	onBeforePageChange: () => {}
};
