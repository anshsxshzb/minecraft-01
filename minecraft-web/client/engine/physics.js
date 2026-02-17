const PLAYER_WIDTH = 0.6;
const PLAYER_HEIGHT = 1.8;
const STEP_HEIGHT = 0.6;
const GRAVITY = 32;
const TERMINAL_VELOCITY = -52; // Phase2

function collides(world, x, y, z) {
  const epsilon = 0.001; // Phase2
  const minX = Math.floor(x - PLAYER_WIDTH / 2 + epsilon);
  const maxX = Math.floor(x + PLAYER_WIDTH / 2 - epsilon);
  const minY = Math.floor(y + epsilon);
  const maxY = Math.floor(y + PLAYER_HEIGHT - epsilon);
  const minZ = Math.floor(z - PLAYER_WIDTH / 2 + epsilon);
  const maxZ = Math.floor(z + PLAYER_WIDTH / 2 - epsilon);

  for (let bx = minX; bx <= maxX; bx += 1) {
    for (let by = minY; by <= maxY; by += 1) {
      for (let bz = minZ; bz <= maxZ; bz += 1) {
        if (world.getBlockGlobal(bx, by, bz) !== 0) return true;
      }
    }
  }
  return false;
}

function isGrounded(world, position) {
  // Phase2: stable grounded probe prevents slope jitter and chunk edge gaps.
  return collides(world, position.x, position.y - 0.06, position.z);
}

export function playerIntersectsAABB(position, x, y, z) {
  // Phase2
  const minX = position.x - PLAYER_WIDTH / 2;
  const maxX = position.x + PLAYER_WIDTH / 2;
  const minY = position.y;
  const maxY = position.y + PLAYER_HEIGHT;
  const minZ = position.z - PLAYER_WIDTH / 2;
  const maxZ = position.z + PLAYER_WIDTH / 2;
  return minX < x + 1 && maxX > x && minY < y + 1 && maxY > y && minZ < z + 1 && maxZ > z;
}

export function integratePlayer(player, controls, world, dt) {
  const maxSubStep = 1 / 120; // Phase2
  const steps = Math.max(1, Math.ceil(dt / maxSubStep));
  const stepDt = dt / steps;

  for (let i = 0; i < steps; i += 1) {
    const speed = controls.isSprinting() ? 7.6 : 5.2; // Phase2
    const controlFactor = player.grounded ? 1 : 0.25; // Phase2
    const forwardX = Math.sin(controls.yaw);
    const forwardZ = Math.cos(controls.yaw);
    const rightX = Math.cos(controls.yaw);
    const rightZ = -Math.sin(controls.yaw);

    const inputX = (forwardX * controls.moveForward + rightX * controls.moveRight) * speed * controlFactor;
    const inputZ = (forwardZ * controls.moveForward + rightZ * controls.moveRight) * speed * controlFactor;

    player.velocity.x += (inputX - player.velocity.x) * 0.26;
    player.velocity.z += (inputZ - player.velocity.z) * 0.26;
    player.velocity.y = Math.max(TERMINAL_VELOCITY, player.velocity.y - GRAVITY * stepDt);

    if (controls.jump && player.grounded) {
      player.velocity.y = 9.6;
      player.grounded = false;
    }

    const axes = ['x', 'y', 'z'];
    for (const axis of axes) {
      const next = player.position[axis] + player.velocity[axis] * stepDt;
      const probe = { ...player.position, [axis]: next };

      if (collides(world, probe.x, probe.y, probe.z)) {
        if (axis === 'y') {
          if (player.velocity.y < 0) player.grounded = true;
        } else if (player.grounded) {
          const stepProbe = { ...probe, y: player.position.y + STEP_HEIGHT };
          if (!collides(world, stepProbe.x, stepProbe.y, stepProbe.z)) {
            player.position.y += STEP_HEIGHT;
            player.position[axis] = next;
            continue;
          }
        }
        player.velocity[axis] = 0;
      } else {
        player.position[axis] = next;
      }
    }

    player.grounded = isGrounded(world, player.position);
  }
}
