const PLAYER_WIDTH = 0.6;
const PLAYER_HEIGHT = 1.8;
const STEP_HEIGHT = 0.6;
const GRAVITY = 28;

function collides(world, x, y, z) {
  const minX = Math.floor(x - PLAYER_WIDTH / 2);
  const maxX = Math.floor(x + PLAYER_WIDTH / 2);
  const minY = Math.floor(y);
  const maxY = Math.floor(y + PLAYER_HEIGHT);
  const minZ = Math.floor(z - PLAYER_WIDTH / 2);
  const maxZ = Math.floor(z + PLAYER_WIDTH / 2);

  for (let bx = minX; bx <= maxX; bx += 1) {
    for (let by = minY; by <= maxY; by += 1) {
      for (let bz = minZ; bz <= maxZ; bz += 1) {
        if (world.getBlockGlobal(bx, by, bz) !== 0) return true;
      }
    }
  }
  return false;
}

export function integratePlayer(player, controls, world, dt) {
  const speed = controls.sprint ? 7 : 5;
  const forwardX = Math.sin(controls.yaw);
  const forwardZ = Math.cos(controls.yaw);
  const rightX = Math.cos(controls.yaw);
  const rightZ = -Math.sin(controls.yaw);

  const moveX = (forwardX * controls.moveForward + rightX * controls.moveRight) * speed;
  const moveZ = (forwardZ * controls.moveForward + rightZ * controls.moveRight) * speed;

  player.velocity.x = moveX;
  player.velocity.z = moveZ;
  player.velocity.y -= GRAVITY * dt;

  if (controls.jump && player.grounded) {
    player.velocity.y = 9.5;
    player.grounded = false;
  }

  const axes = ['x', 'y', 'z'];
  for (const axis of axes) {
    const next = player.position[axis] + player.velocity[axis] * dt;
    const probe = { ...player.position, [axis]: next };

    if (collides(world, probe.x, probe.y, probe.z)) {
      if (axis === 'y') {
        player.grounded = player.velocity.y < 0;
      } else if (axis !== 'y' && player.grounded) {
        const stepProbe = { ...probe, y: player.position.y + STEP_HEIGHT };
        if (!collides(world, stepProbe.x, stepProbe.y, stepProbe.z)) {
          player.position.y += STEP_HEIGHT;
          player.position[axis] = next;
          continue;
        }
      }
      player.velocity[axis] = 0;
    } else {
      if (axis === 'y') player.grounded = false;
      player.position[axis] = next;
    }
  }
}
